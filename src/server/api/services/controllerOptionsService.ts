import { prisma } from "~/server/db";
import { isRunningInDocker } from "~/utils/docker";
import {
	CONTROLLER_SECRET,
	decrypt,
	encrypt,
	generateInstanceSecret,
} from "~/utils/encryption";

/**
 * Connection settings for the local ZeroTier controller.
 *
 * These are one instance wide setting, managed by admins. They used to live on
 * each user's options, which made the controller depend on who was logged in:
 * two members of the same organization could reach different controllers for
 * the same network, and any user could point their own requests (carrying the
 * instance token) at an address of their choosing.
 */

export interface StoredControllerOptions {
	/** URL saved by an admin, null when the default should be used */
	url: string | null;
	/** decrypted token saved by an admin, null when none is stored */
	secret: string | null;
}

/**
 * The old per user columns stay in the UserOptions table for one release so a
 * downgrade still works. Pass this to `omit` wherever user options are sent to
 * a client, so they never leave the database.
 */
export const LEGACY_CONTROLLER_FIELDS = {
	localControllerUrl: true,
	localControllerSecret: true,
} as const;

const ROW_ID = 1;
const CACHE_TTL = 60000; // 60 seconds

// Every controller request needs these, so they are cached. The cache lives on
// globalThis because Next.js can load this module more than once (API routes,
// instrumentation); a save has to be seen by all of them, not just by the copy
// that handled the request.
const cacheHolder = globalThis as unknown as {
	ztnetControllerOptions?: { value: StoredControllerOptions; timestamp: number };
};

export const clearControllerOptionsCache = () => {
	cacheHolder.ztnetControllerOptions = undefined;
};

let defaultLocalControllerUrl: string | undefined;

export const getDefaultLocalControllerUrl = () => {
	defaultLocalControllerUrl ??= isRunningInDocker()
		? "http://zerotier:9993"
		: "http://127.0.0.1:9993";
	return defaultLocalControllerUrl;
};

// `encrypt` output: 16 byte iv and the ciphertext, both hex. A ZeroTier token is
// 24 alphanumeric characters without a colon, so the two cannot be confused.
const ENCRYPTED_SECRET = /^[0-9a-f]{32}:[0-9a-f]+$/;

const encryptSecret = (secret: string) =>
	encrypt(secret, generateInstanceSecret(CONTROLLER_SECRET));

const readSecret = async (stored: string | null): Promise<string | null> => {
	if (!stored) return null;

	if (ENCRYPTED_SECRET.test(stored)) {
		try {
			return decrypt<string>(stored, generateInstanceSecret(CONTROLLER_SECRET));
		} catch (_error) {
			// NEXTAUTH_SECRET changed since the token was saved. Fall back to the
			// environment / authtoken file instead of failing every controller call.
			console.error(
				"The stored ZeroTier controller secret could not be decrypted. Save it again under Admin, Controller.",
			);
			return null;
		}
	}

	// Plain text carried over by the migration from the old per user setting.
	// Encrypt it in place, unless an admin changed it in the meantime.
	try {
		await prisma.controllerOptions.updateMany({
			where: { id: ROW_ID, localControllerSecret: stored },
			data: { localControllerSecret: encryptSecret(stored) },
		});
	} catch (error) {
		console.error("Could not encrypt the stored ZeroTier controller secret", error);
	}
	return stored;
};

/** What an admin saved, without environment overrides or defaults applied. */
export const getStoredControllerOptions = async (): Promise<StoredControllerOptions> => {
	const cached = cacheHolder.ztnetControllerOptions;
	if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
		return cached.value;
	}

	const row = await prisma.controllerOptions.findUnique({ where: { id: ROW_ID } });
	const value: StoredControllerOptions = {
		url: row?.localControllerUrl || null,
		secret: await readSecret(row?.localControllerSecret ?? null),
	};

	cacheHolder.ztnetControllerOptions = { value, timestamp: Date.now() };
	return value;
};

/**
 * Validates and normalizes a controller URL typed by an admin. An empty value
 * means "use the default" and returns null. Throws with a message meant for
 * the admin when the value cannot be used.
 */
export const normalizeLocalControllerUrl = (input: string): string | null => {
	const trimmed = input.trim();
	if (!trimmed) return null;

	let url: URL;
	try {
		url = new URL(trimmed);
	} catch {
		throw new Error("The controller URL is not a valid URL");
	}

	if (url.protocol !== "http:" && url.protocol !== "https:") {
		throw new Error("The controller URL needs to start with http:// or https://");
	}
	if (url.username || url.password) {
		throw new Error("The controller URL cannot contain a username or password");
	}
	// API paths are appended to this value, a query or fragment would swallow them
	if (url.search || url.hash) {
		throw new Error("The controller URL cannot contain a query string or fragment");
	}

	return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
};

/**
 * Saves the controller settings. Only the fields that are passed are changed;
 * null clears a field so the default (URL) or the environment / authtoken file
 * (secret) is used again.
 */
export const saveControllerOptions = async (input: {
	url?: string | null;
	secret?: string | null;
}): Promise<void> => {
	const data: {
		localControllerUrl?: string | null;
		localControllerSecret?: string | null;
	} = {};

	if (input.url !== undefined) data.localControllerUrl = input.url;
	if (input.secret !== undefined) {
		data.localControllerSecret = input.secret ? encryptSecret(input.secret) : null;
	}

	await prisma.controllerOptions.upsert({
		where: { id: ROW_ID },
		create: { id: ROW_ID, ...data },
		update: data,
	});

	clearControllerOptionsCache();
};
