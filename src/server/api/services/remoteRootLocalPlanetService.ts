import crypto from "node:crypto";
import fs from "node:fs";
import { ZT_FOLDER } from "~/utils/ztApi";
import {
	classifyRemoteRootPlanetStatus,
	type RemoteRootPlanetStatus,
	type RemoteRootRestoreMode,
} from "./remoteRootPlanetStatusService";

function sha256File(path: string): string {
	return crypto.createHash("sha256").update(fs.readFileSync(path)).digest("hex");
}

/**
 * Hash of the local custom planet that this controller would distribute.
 * Prefers the mkworld-generated `planet.custom`, falling back to the active
 * `planet` file. Returns null when neither exists.
 */
export function getLocalCustomPlanetHash(): string | null {
	const localPlanetPath = fs.existsSync(`${ZT_FOLDER}/zt-mkworld/planet.custom`)
		? `${ZT_FOLDER}/zt-mkworld/planet.custom`
		: fs.existsSync(`${ZT_FOLDER}/planet`)
			? `${ZT_FOLDER}/planet`
			: null;
	return localPlanetPath ? sha256File(localPlanetPath) : null;
}

/**
 * Classify a remote root's planet status against the current local custom
 * planet. Reads the local hash live so callers always compare against the
 * planet this controller would distribute right now.
 */
export function classifyLocalRemoteRootPlanetStatus(config: {
	remotePlanetHash: string | null;
	remoteOfficialPlanetHash: string | null;
	restoreMode?: RemoteRootRestoreMode | null;
}): RemoteRootPlanetStatus {
	return classifyRemoteRootPlanetStatus({
		remotePlanetHash: config.remotePlanetHash,
		remoteOfficialPlanetHash: config.remoteOfficialPlanetHash,
		localCustomPlanetHash: getLocalCustomPlanetHash(),
		restoreMode: config.restoreMode,
	});
}
