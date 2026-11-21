// Values that mean "no real release version is known" (unset env var at build time).
const UNKNOWN_VERSIONS = new Set(["", "unknown", "development"]);

const isKnownVersion = (version: string | undefined | null): version is string =>
	typeof version === "string" && !UNKNOWN_VERSIONS.has(version.trim().toLowerCase());

/**
 * True when a backup was made by a different app version than the running one.
 * Returns false when either side has no known version (e.g. a local dev build),
 * so such setups are not warned on every restore.
 */
export const isBackupVersionMismatch = (
	backupVersion: string | undefined | null,
	currentVersion: string | undefined | null,
): boolean => {
	if (!isKnownVersion(backupVersion) || !isKnownVersion(currentVersion)) return false;
	return backupVersion.trim() !== currentVersion.trim();
};
