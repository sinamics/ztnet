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

	//!TODO Promise.all causing race condition. Need to refactor to use for loop
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

			// Check if the member is connected and has peers
			const memberIsOnline =
				Object.keys(updatedMember.peers).length > 0 && updatedMember.conStatus !== 0;

			// Create the object with the data to be updated
			const updateData: Partial<network_members> = {
				id: updatedMember.id,
				address: updatedMember.address,
				authorized: updatedMember.authorized,
				online: memberIsOnline,
			};

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

const findExistingMemberName = async (
	ctx: UserContext,
	memberId: string,
	currentNwid: string,
	isOrganization: boolean,
	organizationId?: string,
) => {
	try {
		// First check database for existing name
		const whereClause =
			isOrganization && organizationId
				? {
						id: memberId,
						name: { not: null },
						deleted: false,
						nwid: { not: currentNwid },
						nwid_ref: {
							organizationId: organizationId,
						},
					}
				: {
						id: memberId,
						name: { not: null },
						deleted: false,
						nwid: { not: currentNwid },
						nwid_ref: {
							authorId: ctx.session.user.id,
							organizationId: null,
						},
					};

		const existingMember = await prisma.network_members.findFirst({
			where: whereClause,
			select: { name: true },
			orderBy: {
				creationTime: "desc",
			},
		});

		if (existingMember?.name) {
			return existingMember.name;
		}

		// If no name found in database, check controller
		const networks = await ztController.get_controller_networks(ctx, false);

		const relevantNetworks = await prisma.network.findMany({
			where: {
				AND: [
					{ nwid: { in: networks as string[] } },
					{ nwid: { not: currentNwid } },
					isOrganization && organizationId
						? { organizationId: organizationId }
						: {
								authorId: ctx.session.user.id,
								organizationId: null,
							},
				],
			},
			select: { nwid: true },
		});

		// Search for member in each network using controller
		for (const network of relevantNetworks) {
			try {
				const memberDetails = await ztController.member_details(
					ctx,
					network.nwid,
					memberId,
					false,
				);

				if (memberDetails?.name) {
					return memberDetails.name;
				}
			} catch (_error) {
				// Skip if member not found in this network
			}
		}

		return null;
	} catch (error) {
		console.error("Error finding existing member name:", error);
		return null;
	}
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

	let name = null;

	// send webhook if the new member is joining a organization network
	if (memberOfOrganization) {
		// check if global organization member naming is enabled, and if so find the first available name
		if (memberOfOrganization.organization?.settings?.renameNodeGlobally) {
			name = await findExistingMemberName(
				ctx,
				member.id,
				member.nwid,
				true,
				memberOfOrganization.organizationId,
			);
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

		// Send organization admin notification for new node joining
		try {
			const { sendOrganizationAdminNotification } = await import(
				"~/utils/organizationNotifications"
			);

			// Get network info for notification
			const network = await prisma.network.findUnique({
				where: { nwid: member.nwid },
				select: { name: true },
			});

			await sendOrganizationAdminNotification({
				organizationId: memberOfOrganization.organizationId,
				eventType: "NODE_ADDED",
				eventData: {
					networkId: member.nwid,
					networkName: network?.name || member.nwid,
					nodeId: member.id,
					nodeName: name || member.id,
				},
			});
		} catch (error) {
			// Don't fail the operation if notification fails
			console.error("Failed to send node added notification:", error);
		}
	}

	// Member is not joining an organization network
	if (!memberOfOrganization.organizationId) {
		// check if addMemberIdAsName is enabled, and if so use the member id as the name
		if (user.options?.addMemberIdAsName) {
			name = member.id;
		}

		// check if global naming is enabled, and if so find the first available name
		// NOTE! this will take precedence over addMemberIdAsName above
		if (user.options?.renameNodeGlobally) {
			name = (await findExistingMemberName(ctx, member.id, member.nwid, false)) || name;
		}
	}

	try {
		return await prisma.network_members.upsert({
			where: {
				id_nwid: {
					id: member.id,
					nwid: member.nwid,
				},
			},
			create: {
				id: member.id,
				lastSeen: new Date(),
				creationTime: new Date(),
				name,
				nwid_ref: { connect: { nwid: member.nwid } },
				deleted: false,
			},
			update: {
				lastSeen: new Date(),
			},
		});
	} catch (error) {
		console.error("Error upserting network member:", error);
	}
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
