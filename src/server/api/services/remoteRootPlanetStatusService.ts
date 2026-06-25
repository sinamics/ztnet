export type RemoteRootRestoreMode = "backup_restored" | "custom_removed";

export type RemoteRootPlanetStatus =
	| "UNKNOWN"
	| "MISSING"
	| "CUSTOM_MATCH"
	| "CUSTOM_OTHER"
	| "OFFICIAL_RESTORED"
	| "OFFICIAL_OR_DEFAULT"
	| "OFFICIAL_OR_UNKNOWN";

export function classifyRemoteRootPlanetStatus({
	remotePlanetHash,
	remoteOfficialPlanetHash,
	localCustomPlanetHash,
	restoreMode,
}: {
	remotePlanetHash: string | null;
	remoteOfficialPlanetHash: string | null;
	localCustomPlanetHash: string | null;
	restoreMode?: RemoteRootRestoreMode | null;
}): RemoteRootPlanetStatus {
	if (
		remotePlanetHash &&
		remoteOfficialPlanetHash &&
		remotePlanetHash === remoteOfficialPlanetHash
	) {
		return "OFFICIAL_RESTORED";
	}
	if (restoreMode === "custom_removed" && !remotePlanetHash) {
		return "OFFICIAL_OR_DEFAULT";
	}
	if (!remotePlanetHash) return "MISSING";
	if (localCustomPlanetHash && remotePlanetHash === localCustomPlanetHash) {
		return "CUSTOM_MATCH";
	}
	return localCustomPlanetHash ? "CUSTOM_OTHER" : "OFFICIAL_OR_UNKNOWN";
}
