import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// Debian layout used by the apt.postgresql.org packages bundled in the Docker image.
export const PG_BIN_ROOT = "/usr/lib/postgresql";

interface PgConnection {
	host: string;
	port: string;
	username: string;
	database: string;
	env: NodeJS.ProcessEnv;
}

/**
 * Convert the value of `SHOW server_version_num` (e.g. "160014") to a major
 * version (e.g. 16). Returns null if the value is not a positive integer.
 */
export function parseServerMajor(serverVersionNum: string): number | null {
	const trimmed = serverVersionNum.trim();
	if (!/^\d+$/.test(trimmed)) return null;
	const num = Number.parseInt(trimmed, 10);
	if (num <= 0) return null;
	return Math.floor(num / 10000);
}

/**
 * Ask the server for its major version. psql is version-agnostic for this
 * query, so any bundled client works. Returns null if detection fails.
 */
export function detectServerMajor(conn: PgConnection): number | null {
	try {
		const output = execFileSync(
			"psql",
			[
				"-h",
				conn.host,
				"-p",
				conn.port,
				"-U",
				conn.username,
				"-d",
				conn.database,
				"-w",
				"-tAc",
				"SHOW server_version_num",
			],
			{ env: conn.env, stdio: ["pipe", "pipe", "pipe"], timeout: 15000 },
		);
		return parseServerMajor(output.toString());
	} catch {
		return null;
	}
}

/**
 * List the PostgreSQL client major versions installed under binRoot
 * (Debian keeps each version's tools in /usr/lib/postgresql/<major>/bin).
 */
export function listInstalledClientMajors(binRoot: string = PG_BIN_ROOT): number[] {
	try {
		return fs
			.readdirSync(binRoot)
			.filter((entry) => /^\d+$/.test(entry))
			.map((entry) => Number.parseInt(entry, 10))
			.filter((major) =>
				fs.existsSync(path.join(binRoot, String(major), "bin", "pg_dump")),
			)
			.sort((a, b) => a - b);
	} catch {
		return [];
	}
}

/**
 * Pick the client major to use for dumping a server. pg_dump refuses servers
 * newer than itself, so only equal or newer clients are candidates; the
 * closest one wins to keep the dump format as close to the server as possible.
 */
export function selectClientMajor(
	serverMajor: number,
	installed: number[],
): number | null {
	const candidates = installed.filter((major) => major >= serverMajor);
	if (candidates.length === 0) return null;
	return Math.min(...candidates);
}

/**
 * Resolve the pg_dump binary to use for the given server. Falls back to plain
 * "pg_dump" when the server version is unknown or no versioned clients are
 * installed (e.g. standalone installs on non-Debian systems). Throws when the
 * server is newer than every bundled client, since the dump would fail with a
 * confusing "server version mismatch" error anyway.
 */
export function resolvePgDumpPath(
	serverMajor: number | null,
	binRoot: string = PG_BIN_ROOT,
): string {
	if (serverMajor === null) return "pg_dump";

	const installed = listInstalledClientMajors(binRoot);
	if (installed.length === 0) return "pg_dump";

	const selected = selectClientMajor(serverMajor, installed);
	if (selected === null) {
		throw new Error(
			`PostgreSQL server is version ${serverMajor}, but the newest pg_dump bundled with this image is version ${Math.max(
				...installed,
			)}. Update ztnet to an image that bundles postgresql-client-${serverMajor}.`,
		);
	}
	return path.join(binRoot, String(selected), "bin", "pg_dump");
}
