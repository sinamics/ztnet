import { MemberEntity, Paths, Peers } from "~/types/local/member";
import { retrieveActiveMemberFromDatabase } from "../services/networkService";

export const craftMemberFactory = async (
	nwid: string,
	controllerMembers: MemberEntity[],
	peersByAddress: Peers[],
) => {
	const memberPromises = controllerMembers.map((member) =>
		enrichMemberDetails(nwid, member, peersByAddress),
	);
	const enrichedMembers = await Promise.all(memberPromises);
	return enrichedMembers.filter(Boolean); // Filters out any null values
};

const determineActivePreferredPath = (peers: Peers) => {
	return "paths" in peers && peers.paths.length > 0
		? peers.paths.find((path: Paths) => path.active && path.preferred)
		: undefined;
};

const enrichMemberDetails = async (
	nwid: string,
	member: MemberEntity,
	peersByAddress: Peers[],
) => {
	const dbMember = await retrieveActiveMemberFromDatabase(nwid, member.id);
	if (!dbMember) return null;

	const peers = peersByAddress[dbMember.address] || [];
	const activePreferredPath = determineActivePreferredPath(peers);

	if (!activePreferredPath) return { ...dbMember, ...member, peers: {} };

	const { address: physicalAddress, ...restOfActivePreferredPath } = activePreferredPath;
	return {
		...dbMember,
		...member,
		peers: { ...peers, physicalAddress, ...restOfActivePreferredPath },
	};
};
