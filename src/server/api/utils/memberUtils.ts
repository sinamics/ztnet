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
	const regex = new RegExp(`^${member.id}`);
	if (regex.test(member.nwid)) {
		return ConnectionStatus.Controller;
	}
	// fix for zt version 1.12. Return type of peer is object!.
	if (!member?.peers || Object.keys(member?.peers).length === 0) {
		return ConnectionStatus.Offline;
	}

	if (Array.isArray(member?.peers) && member?.peers.length === 0) {
		return ConnectionStatus.Offline;
	}

	if (member?.peers?.latency === -1 || member?.peers?.versionMajor === -1) {
		return ConnectionStatus.Relayed;
	}

	// Check if at least one path has a private IP
	if (member?.peers?.paths && member?.peers.paths.length > 0) {
		for (const path of member.peers.paths) {
			const ip = path.address.split("/")[0];
			if (isPrivateIP(ip)) {
				return ConnectionStatus.DirectLAN;
			}
		}
	}

	return ConnectionStatus.DirectWAN;
}
