import { MemberEntity, Paths, Peers } from "~/types/local/member";
import { retrieveActiveMemberFromDatabase } from "../services/memberService";

/**
 * Crafts a member by enriching member details.
 *
 * @param nwid - The network ID.
 * @param controllerMembers - An array of controller members.
 * @param peersByAddress - An array of peers.
 * @returns A Promise that resolves to an array of enriched members.
 */
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

/**
 * Enriches the details of a member by retrieving additional information from the database and
 * combining it with the Controller member object and peer information.
 *
 * @param nwid - The network ID.
 * @param member - The member entity object.
 * @param peersByAddress - An array of peers grouped by address.
 * @returns A new object with the enriched member details, including the combined member and peer information,
 * or null if the member is not found in the database.
 */
const enrichMemberDetails = async (
	nwid: string,
	member: MemberEntity,
	peersByAddress: Peers[],
) => {
	const dbMember = await retrieveActiveMemberFromDatabase(nwid, member.id);
	if (!dbMember) return null;

	const peers = peersByAddress[dbMember.address] || [];
	const activePreferredPath = findActivePreferredPeerPath(peers);

	if (!activePreferredPath) return { ...dbMember, ...member, peers: {} };

	const { address: physicalAddress, ...restOfActivePreferredPath } = activePreferredPath;
	return {
		...dbMember,
		...member,
		peers: { ...peers, physicalAddress, ...restOfActivePreferredPath },
	};
};

/**
 * Determines the active preferred path from the given peers.
 *
 * @param peers - The peers object containing paths.
 * @returns The active preferred path, or undefined if not found.
 */
const findActivePreferredPeerPath = (peers: Peers) => {
	return "paths" in peers && peers.paths.length > 0
		? peers.paths.find((path: Paths) => path.active && path.preferred)
		: undefined;
};
