import { UserContext } from "~/types/ctx";
import { MemberEntity, Peers } from "~/types/local/member";
import * as ztController from "~/utils/ztApi";

export const fetchPeersForAllMembers = async (
	ctx: UserContext,
	members: MemberEntity[],
): Promise<Peers[]> => {
	const memberAddresses = members.map((member) => member.address);
	const peerPromises = memberAddresses.map((address) =>
		ztController.peer(ctx, address).catch(() => null),
	);

	const peers = await Promise.all(peerPromises);
	const peersByAddress: Peers[] = [];

	// biome-ignore lint/complexity/noForEach: <explanation>
	memberAddresses.forEach((address, index) => {
		peersByAddress[address] = peers[index];
	});

	return peersByAddress;
};
