// app/server/actions/network.ts
"use server";

import { network, network_members } from "@prisma/client";
import { z } from "zod";
import { auth } from "~/server/auth";
import { prisma } from "~/server/db";
import * as ztController from "~/utils/ztApi";

// Types
interface MemberCounts {
	authorized: number;
	total: number;
	display: string;
}

interface NetworkWithMemberCount extends network {
	memberCounts: MemberCounts;
	networkMembers: network_members[];
}

// Input validation
const getUserNetworksSchema = z.object({
	central: z.boolean().optional().default(false),
});

type GetUserNetworksInput = z.infer<typeof getUserNetworksSchema>;

export async function getUserNetworks(input: GetUserNetworksInput) {
	// Validate session
	const session = await auth();
	if (!session) {
		throw new Error("Unauthorized");
	}

	// Validate input
	const validatedInput = getUserNetworksSchema.parse(input);

	// If central networks are requested
	if (validatedInput.central) {
		return await ztController.get_controller_networks(
			session.user.id,
			validatedInput.central,
		);
	}

	// Get networks from database with members
	const rawNetworks = (await prisma.network.findMany({
		where: {
			authorId: session.user.id,
		},
		include: {
			networkMembers: {
				select: {
					id: true,
					deleted: true,
				},
			},
		},
	})) as unknown as Omit<NetworkWithMemberCount, "memberCounts">[];

	// Initialize networks with memberCounts property
	const networks: NetworkWithMemberCount[] = rawNetworks.map((network) => ({
		...network,
		memberCounts: {
			authorized: 0,
			total: 0,
			display: "0 (0)",
		},
	}));

	// Get authorized member and total member counts for each network
	for (const network of networks) {
		for (const member of network.networkMembers) {
			const memberDetails = await ztController.member_details(
				session.user.id,
				network.nwid,
				member.id,
			);

			if (memberDetails.authorized) {
				network.memberCounts.authorized += 1;
			}
			network.memberCounts.total += 1;
			network.memberCounts.display = `${network.memberCounts.authorized} (${network.memberCounts.total})`;
		}
	}

	return networks;
}

// Export types for use in components
export type UserNetworks = Awaited<ReturnType<typeof getUserNetworks>>;
