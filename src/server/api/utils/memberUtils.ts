import { MemberEntity } from "~/types/local/member";
import { isPrivateIP } from "./ipUtils";

export enum ConnectionStatus {
	Offline = 0,
	Relayed = 1,
	DirectLAN = 2,
	DirectWAN = 3,
	Controller = 4,
}

export function determineConnectionStatus(member: MemberEntity): ConnectionStatus {
	// Check for Controller status
	const regex = new RegExp(`^${member.id}`);
	if (regex.test(member.nwid)) {
		return ConnectionStatus.Controller;
	}

	// Determine if Offline
	const peerKeys = Object.keys(member?.peers || {});
	if (!peerKeys || (peerKeys.length === 1 && peerKeys.includes("physicalAddress"))) {
		return ConnectionStatus.Offline;
	}

	// At this point, it is ensured that the peers object exists and has more properties
	const { latency, paths } = member.peers;

	// Determine if Relayed
	if (latency === -1) {
		return ConnectionStatus.Relayed;
	}

	// Determine Direct connection type (DirectLAN or DirectWAN)
	if (Array.isArray(paths) && paths.some((path) => path.active && !path.expired)) {
		const hasDirectLAN = paths.some((path) => {
			const ip = path.address.split("/")[0];
			return isPrivateIP(ip);
		});

		return hasDirectLAN ? ConnectionStatus.DirectLAN : ConnectionStatus.DirectWAN;
	}

	// If none of the above conditions are met, default to Offline as a fallback
	return ConnectionStatus.Offline;
}
