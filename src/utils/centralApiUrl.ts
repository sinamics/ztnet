import { Agent } from "node:https";
import type { LookupFunction } from "node:net";
import {
	BlockedUrlError,
	type PinnedTarget,
	type TargetPolicy,
	assertPublicHttpsUrl,
	resolvePublicTarget,
} from "~/utils/ssrfGuard";

/**
 * The ZeroTier Central API URL is a per user setting: any signed in user can
 * change it for their own account, the server then calls it and hands the
 * response back to that user. Left unchecked that is a way to read whatever
 * the server can reach (the local controller, compose services, cloud
 * metadata). So the URL has to be a public https endpoint, and the request is
 * pinned to the address that was checked.
 */

export const DEFAULT_CENTRAL_API_URL = "https://api.zerotier.com/api/v1";

// Unlike webhooks there is no opt in for private networks: the response is
// readable and the setting is not limited to admins.
export const CENTRAL_API_TARGET_POLICY: TargetPolicy = {
	label: "ZeroTier Central API URL",
	allowPrivate: () => false,
};

/**
 * Validates and normalizes a Central API URL without touching DNS. An empty
 * value means "use the default" and returns null. Throws `BlockedUrlError`
 * with a message meant for the user when the value cannot be used.
 */
export const normalizeCentralApiUrl = (input: string): string | null => {
	const trimmed = input.trim();
	if (!trimmed) return null;

	const url = assertPublicHttpsUrl(trimmed, CENTRAL_API_TARGET_POLICY);
	const { label } = CENTRAL_API_TARGET_POLICY;

	if (url.username || url.password) {
		throw new BlockedUrlError(`${label} cannot contain a username or password`);
	}
	// API paths are appended to this value, a query or fragment would swallow them
	if (url.search || url.hash) {
		throw new BlockedUrlError(`${label} cannot contain a query string or fragment`);
	}

	return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
};

export interface CentralApiTarget {
	/** normalized base URL, API paths are appended to it */
	url: string;
	/** the checked address requests have to connect to */
	pinned: PinnedTarget;
}

/**
 * The request time check, and the actual security boundary: resolves the host
 * and refuses it unless it is a public address. Also runs for values stored
 * before this check existed, so those fail closed.
 */
export const resolveCentralApiTarget = async (
	rawUrl: string | null | undefined,
): Promise<CentralApiTarget> => {
	const url = normalizeCentralApiUrl(rawUrl ?? "") ?? DEFAULT_CENTRAL_API_URL;

	try {
		return { url, pinned: await resolvePublicTarget(url, CENTRAL_API_TARGET_POLICY) };
	} catch (error) {
		if (error instanceof BlockedUrlError) throw error;
		throw new BlockedUrlError(
			`Could not resolve the ZeroTier Central API host ${new URL(url).hostname}`,
		);
	}
};

/**
 * An agent that connects to the address that was checked, whatever DNS says
 * by the time the request is made (DNS rebinding). The hostname is still used
 * for the Host header, SNI and certificate validation.
 */
export const pinnedHttpsAgent = ({ hostname, address, family }: PinnedTarget): Agent => {
	const lookup: LookupFunction = (requested, options, callback) => {
		if (requested !== hostname) {
			callback(new Error(`Refusing to connect to ${requested}`), "", family);
			return;
		}
		if (options.all) {
			callback(null, [{ address, family }]);
			return;
		}
		callback(null, address, family);
	};

	return new Agent({ lookup });
};
