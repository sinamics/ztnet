import { UserContext } from "~/types/ctx";
import { MemberEntity, Peers } from "~/types/local/member";
import * as ztController from "~/utils/ztApi";
import { determineConnectionStatus } from "../utils/memberUtils";
import { network_members } from "@prisma/client";
import { prisma } from "~/server/db";
import { sendWebhook } from "~/utils/webhook";
import { HookType, MemberJoined } from "~/types/webhooks";
import { throwError } from "~/server/helpers/errorHandler";

/**
 * Fetches peers for all members.
 * @param ctx - The user context.
 * @param members - An array of member entities.
 * @returns A promise that resolves to an array of peers.
 */
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

/**
 * Synchronizes the peers and connection status of the given members.
 * @param ctx - The user context.
 * @param members - An array of member entities.
 * @param peersByAddress - An array of peers grouped by address.
 */
export const syncMemberPeersAndStatus = async (
	ctx: UserContext,
	members: MemberEntity[],
	peersByAddress: Peers[],
) => {
	if (!members || members.length === 0) return;

	for (const member of members) {
		member.peers = peersByAddress[member.address] || [];
		member.conStatus = determineConnectionStatus(member);
	}

	await psql_updateMember(ctx, members);
};

/**
 * Updates the members in the database with the provided data.
 * If a member does not exist, it will be added to the database.
 *
 * @param ctx - The user context.
 * @param members - An array of member entities to update.
 * @returns A Promise that resolves when the update is complete.
 */
const psql_updateMember = async (
	ctx: UserContext,
	members: MemberEntity[],
): Promise<void> => {
	for (const member of members) {
		const storeValues: Partial<network_members> = {
			id: member.id,
			address: member.address,
		};

		if (member.peers && member.conStatus !== 0) {
			storeValues.lastSeen = new Date();
		}
		const updateMember = await prisma.network_members.updateMany({
			where: { nwid: member.nwid, id: member.id },
			data: storeValues,
		});

		if (!updateMember.count) {
			try {
				await psql_addMember(ctx, member);
			} catch (error) {
				// biome-ignore lint/suspicious/noConsoleLog: <explanation>
				console.log(error);
			}
		}
	}
};

/**
 * Adds a member to the database.
 *
 * @param ctx - The context object.
 * @param member - The member entity to be added.
 * @returns A promise that resolves to the created network member.
 */
const psql_addMember = async (ctx, member: MemberEntity) => {
	const user = await ctx.prisma.user.findFirst({
		where: {
			id: ctx.session.user.id,
		},
		select: {
			options: true,
		},
	});

	const memberData = {
		id: member.id,
		lastSeen: new Date(),
		creationTime: new Date(),
		name: user.options?.addMemberIdAsName ? member.id : null,
	};

	// check if the new member is joining a organization network
	const org = await prisma.network.findFirst({
		where: { nwid: member.nwid },
		select: { organizationId: true },
	});

	// send webhook if the new member is joining a organization network
	if (org) {
		try {
			// Send webhook
			await sendWebhook<MemberJoined>({
				hookType: HookType.NETWORK_JOIN,
				organizationId: org.organizationId,
				memberId: member.id,
				networkId: member.nwid,
			});
		} catch (error) {
			// add error messge that webhook failed
			throwError(error.message);
		}
	}

	return await prisma.network_members.create({
		data: {
			...memberData,
			nwid_ref: {
				connect: { nwid: member.nwid },
			},
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
		where: { nwid, id: memberId },
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
