import { uniqueNamesGenerator } from "unique-names-generator";
import { CustomLimitError, throwError } from "~/server/helpers/errorHandler";
import { IPv4gen } from "~/utils/IPv4gen";
import { customConfig } from "../routers/networkRouter";
import * as ztController from "~/utils/ztApi";
import { MemberEntity, Peers } from "~/types/local/member";
import { UserContext } from "~/types/ctx";
import { network_members } from "@prisma/client";
import { sendWebhook } from "~/utils/webhook";
import { HookType, MemberJoined } from "~/types/webhooks";
import { isPrivateIP } from "../utils/ipUtils";
import { prisma } from "~/server/db";

export enum ConnectionStatus {
	Offline = 0,
	Relayed = 1,
	DirectLAN = 2,
	DirectWAN = 3,
	Controller = 4,
}

function determineConnectionStatus(member: MemberEntity): ConnectionStatus {
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

export const updateNetworkMembers = async (
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

export const createNetworkService = async ({ ctx, input }) => {
	try {
		// 1. Fetch the user with its related UserGroup
		const userWithGroup = await ctx.prisma.user.findUnique({
			where: { id: ctx.session.user.id },
			select: {
				userGroup: true,
			},
		});

		if (userWithGroup?.userGroup) {
			// 2. Fetch the current number of networks linked to the user
			const currentNetworksCount = await ctx.prisma.network.count({
				where: { authorId: ctx.session.user.id },
			});

			// Check against the defined limit
			const networkLimit = userWithGroup.userGroup.maxNetworks;
			if (currentNetworksCount >= networkLimit) {
				throw new CustomLimitError(
					"You have reached the maximum number of networks allowed for your user group.",
				);
			}
		}

		// Generate ipv4 address, cidr, start & end
		const ipAssignmentPools = IPv4gen(null);

		if (!input?.name) {
			// Generate adjective and noun word
			input.name = uniqueNamesGenerator(customConfig);
		}

		// Create ZT network
		const newNw = await ztController.network_create(
			ctx,
			input.name,
			ipAssignmentPools,
			input.central,
		);

		if (input.central) return newNw;

		// Store the created network in the database
		await ctx.prisma.user.update({
			where: {
				id: ctx.session.user.id,
			},
			data: {
				network: {
					create: {
						name: newNw.name,
						nwid: newNw.nwid,
					},
				},
			},
			select: {
				network: true,
			},
		});
		return newNw;
	} catch (err: unknown) {
		if (err instanceof CustomLimitError) {
			throwError(err.message);
		} else if (err instanceof Error) {
			console.error(err);
			throwError("Could not create network! Please try again");
		} else {
			throwError("An unknown error occurred");
		}
	}
};
