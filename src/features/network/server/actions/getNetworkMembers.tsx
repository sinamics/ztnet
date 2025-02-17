"use server";

import type { network_members } from "@prisma/client";
import { type NetworkInput, networkInputSchema } from "../../schemas/getNetworkById";
import { AuthContextManager } from "~/lib/authContext";
import { auth } from "~/server/auth";
import * as ztController from "~/utils/ztApi";
import {
	syncMemberPeersAndStatus,
	fetchZombieMembers,
} from "~/server/api/services/memberService";
import { prisma } from "~/server/db";
import type { MemberEntity } from "~/types/local/member";

class NetworkActionError extends Error {
	constructor(
		message: string,
		public statusCode: number,
	) {
		super(message);
		this.name = "NetworkActionError";
	}
}

async function getUserId(): Promise<string> {
	// Try to get WebSocket context first
	const wsContext = AuthContextManager.getInstance().getContext();

	if (wsContext) {
		return wsContext.userId;
	}

	// Regular HTTP context
	const session = await auth();
	if (!session?.user) {
		throw new NetworkActionError("Unauthorized", 401);
	}
	return session.user.id;
}

export async function getNetworkMembers(input: NetworkInput): Promise<network_members[]> {
	try {
		const parsedInput = networkInputSchema.parse(input);
		const userId = await getUserId();

		// Handle central network case
		if (parsedInput.central) {
			const centralResponse = await ztController.central_network_detail(
				userId,
				parsedInput.nwid,
				parsedInput.central,
			);
			return {
				members: centralResponse.members,
				zombieMembers: [],
			};
		}

		// Get network details from ZT controller
		const ztControllerResponse = await ztController
			.ZTApiGetNetworkInfo(userId, parsedInput.nwid, false)
			.catch((err) => {
				throw new NetworkActionError(`Controller error: ${err.message}`, 500);
			});

		if (!ztControllerResponse) {
			throw new NetworkActionError("Failed to get network details!", 500);
		}

		// Sync members and get statuses
		const membersWithStatusAndPeers = await syncMemberPeersAndStatus(
			userId,
			parsedInput.nwid,
			ztControllerResponse.members,
		);

		// Get zombie members
		const zombieMembers = await fetchZombieMembers(
			parsedInput.nwid,
			ztControllerResponse.members,
		);

		// Merge members
		const mergedMembersMap = new Map();
		for (const member of membersWithStatusAndPeers) {
			if (member) {
				mergedMembersMap.set(member.id, member);
			}
		}

		// Get database members
		const databaseMembers = await prisma.network_members.findMany({
			where: {
				nwid: parsedInput.nwid,
				deleted: false,
			},
		});

		for (const member of databaseMembers) {
			if (!mergedMembersMap.has(member.id)) {
				mergedMembersMap.set(member.id, member);
			}
		}

		return {
			members: Array.from(mergedMembersMap.values()) as MemberEntity[],
			zombieMembers,
		};
	} catch (error) {
		if (error instanceof NetworkActionError) {
			throw error;
		}
		console.error("Unexpected error in getNetworkMembers:", error);
		throw new NetworkActionError("An unexpected error occurred", 500);
	}
}
