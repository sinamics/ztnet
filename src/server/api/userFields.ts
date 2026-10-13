/**
 * Columns of the User table that must never be sent to a client: not to the
 * user they belong to, and certainly not to anyone else. Pass this to `omit`
 * on any user query whose result leaves the server.
 */
export const USER_SECRET_FIELDS = {
	hash: true,
	tempPassword: true,
	twoFactorSecret: true,
	twoFactorRecoveryCodes: true,
} as const;

export type UserSecretField = keyof typeof USER_SECRET_FIELDS;

/** What the members of an organization may see of each other. */
export const ORG_MEMBER_FIELDS = {
	id: true,
	name: true,
	email: true,
} as const;

const SECRET_KEYS = new Set<string>(Object.keys(USER_SECRET_FIELDS));

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
	if (value === null || typeof value !== "object") return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
};

const containsUserSecrets = (value: unknown): boolean => {
	const seen = new WeakSet<object>();

	const walk = (node: unknown): boolean => {
		if (Array.isArray(node)) {
			if (seen.has(node)) return false;
			seen.add(node);
			return node.some(walk);
		}
		if (!isPlainObject(node) || seen.has(node)) return false;
		seen.add(node);
		return Object.keys(node).some((key) => SECRET_KEYS.has(key) || walk(node[key]));
	};

	return walk(value);
};

/**
 * Returns the response without the secret user columns, wherever they are
 * nested. A clean response is returned as is; otherwise a copy is made, the
 * original is never changed since it may be an object the server still uses.
 *
 * This is a backstop, not the way to keep these columns private: a query that
 * selects them is a bug even when nothing reaches the client.
 */
export const withoutUserSecrets = <T>(value: T): T => {
	if (!containsUserSecrets(value)) return value;

	// maps each original to its copy, so shared and circular references stay intact
	const copies = new WeakMap<object, unknown>();

	const copy = (node: unknown): unknown => {
		if (Array.isArray(node)) {
			if (copies.has(node)) return copies.get(node);
			const result: unknown[] = [];
			copies.set(node, result);
			for (const item of node) result.push(copy(item));
			return result;
		}
		if (!isPlainObject(node)) return node;
		if (copies.has(node)) return copies.get(node);

		const result: Record<string, unknown> = {};
		copies.set(node, result);
		for (const key of Object.keys(node)) {
			if (SECRET_KEYS.has(key)) continue;
			// defineProperty, so a key named __proto__ stays an ordinary key
			Object.defineProperty(result, key, {
				value: copy(node[key]),
				enumerable: true,
				writable: true,
				configurable: true,
			});
		}
		return result;
	};

	return copy(value) as T;
};
