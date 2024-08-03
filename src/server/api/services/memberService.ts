import { UserContext } from "~/types/ctx";
import { MemberEntity, Peers } from "~/types/local/member";
import { determineConnectionStatus } from "../utils/memberUtils";
import * as ztController from "~/utils/ztApi";
import { prisma } from "~/server/db";
import { sendWebhook } from "~/utils/webhook";
import { HookType, MemberJoined } from "~/types/webhooks";
import { throwError } from "~/server/helpers/errorHandler";
import { network_members } from "@prisma/client";

/**
 * syncMemberPeersAndStatus
 * Synchronizes the peers and connection status of the given members.
 * @param ctx - The user context.
 * @param members - An array of member entities.
 * @param peersByAddress - An array of peers grouped by address.
 */
export const syncMemberPeersAndStatus = async (
	ctx: UserContext,
	nwid: string,
	ztMembers: MemberEntity[],
) => {
	if (ztMembers.length === 0) return [];
	// get peers
	const controllerPeers = await ztController.peers(ctx);

	const updatedMembers = await Promise.all(
		ztMembers.map(async (ztMember) => {
			// TODO currently there is no way to distinguish peers by network id, so we have to fetch all peers
			// this will make the node active in all networks it is part of if it is active in one of them.
			// Should open a issue at ZeroTier
			const peers = controllerPeers.filter(
				(peer) => peer.address === ztMember.address,
			)[0];

			// Retrieve the member from the database
			const dbMember = await retrieveActiveMemberFromDatabase(nwid, ztMember.id);

			// Find the active preferred path in the peers object
			const activePreferredPath = findActivePreferredPeerPath(peers);
			const { physicalAddress, ...restOfDbMembers } = dbMember || {};

			// Merge the data from the database with the data from Controller
			const updatedMember = {
				...restOfDbMembers,
				...ztMember,
				physicalAddress: activePreferredPath?.address ?? physicalAddress,
				peers: peers || {},
			} as MemberEntity;

			// Update the connection status
			updatedMember.conStatus = determineConnectionStatus(updatedMember);

			// Create the object with the data to be updated
			const updateData: Partial<network_members> = {
				id: updatedMember.id,
				address: updatedMember.address,
			};

			// Check if the member is connected and has peers, if so, update the lastSeen
			const memberIsOnline =
				Object.keys(updatedMember.peers).length > 0 && updatedMember.conStatus !== 0;

			// add lastSeen to updateData if the member is connected
			if (memberIsOnline) {
				updateData.lastSeen = new Date();
			}

			// update physicalAddress if the member is connected
			if (memberIsOnline && updatedMember?.physicalAddress) {
				updateData.physicalAddress = updatedMember.physicalAddress;
			}

			// Update the member in the database
			const updateResult = await prisma.network_members.updateMany({
				where: { nwid: updatedMember.nwid, id: updatedMember.id },
				data: updateData,
			});

			// If the member was not found in the database, add it
			if (updateResult.count === 0) {
				await addNetworkMember(ctx, updatedMember).catch(console.error);
			}

			// Return null if the member is deleted.
			if (!dbMember) {
				return null;
			}

			// Return the updated member
			return updatedMember;
		}),
	);
	// console.log(updatedMembers);
	// console.log(updatedMembers[0].peers?.paths);
	return updatedMembers.filter(Boolean); // Filter out any null values
};

/**
 * Determines the active preferred path from the given peers.
 *
 * @param peers - The peers object containing paths.
 * @returns The active preferred path, or undefined if not found.
 */
const findActivePreferredPeerPath = (peers: Peers | null) => {
	if (!peers || typeof peers !== "object" || !Array.isArray(peers.paths)) {
		return null;
	}
	const { paths } = peers;
	const res = paths.find((path) => path?.active && path?.preferred);

	return { ...res };
};

/**
 * Adds a member to the database.
 *
 * @param ctx - The context object.
 * @param member - The member entity to be added.
 * @returns A promise that resolves to the created network member.
 */
const addNetworkMember = async (ctx, member: MemberEntity) => {
	// 1. get the user options
	// 2. check if the new member is joining a organization network
	const [user, memberOfOrganization] = await Promise.all([
		prisma.user.findUnique({
			where: { id: ctx.session.user.id },
			select: { options: true, network: { select: { nwid: true } } },
		}),
		prisma.network.findFirst({
			where: { nwid: member.nwid },
			select: { organizationId: true, organization: { select: { settings: true } } },
		}),
	]);

	const findNamedMember = async ({ orgId }: { orgId: string }) => {
		return await prisma.network_members.findFirst({
			where: {
				id: member.id,
				name: { not: null },
				nwid_ref: {
					organizationId: orgId,
					authorId: orgId ? null : ctx.session.user.id,
				},
			},
			select: { name: true },
		});
	};

	let name = null;

	// send webhook if the new member is joining a organization network
	if (memberOfOrganization) {
		// check if global organization member naming is enabled, and if so find the first available name
		if (memberOfOrganization.organization?.settings?.renameNodeGlobally) {
			const namedOrgMember = await findNamedMember({
				orgId: memberOfOrganization.organizationId,
			});
			name = namedOrgMember?.name;
		}
		try {
			// Send webhook
			await sendWebhook<MemberJoined>({
				hookType: HookType.NETWORK_JOIN,
				organizationId: memberOfOrganization.organizationId,
				memberId: member.id,
				networkId: member.nwid,
			});
		} catch (error) {
			// add error messge that webhook failed
			throwError(error.message);
		}
	}

	// check if global naming is enabled, and if so find the first available name
	if (user.options?.renameNodeGlobally && !memberOfOrganization.organizationId) {
		const namedPrivateMember = await findNamedMember({ orgId: null });
		name = namedPrivateMember?.name;
	}

	return await prisma.network_members.create({
		data: {
			id: member.id,
			lastSeen: new Date(),
			creationTime: new Date(),
			name,
			nwid_ref: { connect: { nwid: member.nwid } },
		},
	});
};

/**
 * Retrieves an active member from the database based on the network ID and member ID.
 * @param nwid - The network ID.
 * @param memberId - The member ID.
 * @returns The active member object if found, otherwise null.
 */
export const retrieveActiveMemberFromDatabase = async (
	nwid: string,
	memberId: string,
) => {
	const dbMember = await prisma.network_members.findFirst({
		where: { nwid, id: memberId, deleted: false },
		include: { notations: { include: { label: true } } },
	});
	return dbMember && !dbMember.deleted ? dbMember : null;
};

/**
 * Fetches zombie members from the database based on the provided network ID and enriched members.
 * A zombie member is a member that has been deleted.
 *
 * @param nwid - The network ID.
 * @param enrichedMembers - An array of enriched member entities.
 * @returns An array of zombie members.
 */
export const fetchZombieMembers = async (
	nwid: string,
	enrichedMembers: MemberEntity[],
) => {
	const getZombieMembersPromises = enrichedMembers.map((member) => {
		return prisma.network_members.findFirst({
			where: {
				nwid,
				id: member.id,
				deleted: true,
			},
		});
	});

	const zombieMembers = await Promise.all(getZombieMembersPromises);
	return zombieMembers.filter(Boolean);
};
