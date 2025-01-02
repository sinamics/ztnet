"use server";

import * as ztController from "~/utils/ztApi";
import { auth } from "~/server/auth";
import { prisma } from "~/server/db";
import { NetworkAndMemberResponse } from "~/types/network";
import { NetworkInput, networkInputSchema } from "../../schemas/getNetworkById";
import {
	fetchZombieMembers,
	syncMemberPeersAndStatus,
} from "~/server/api/services/memberService";
import { IPv4gen } from "~/utils/IPv4gen";
import { syncNetworkRoutes } from "~/server/api/services/routesService";
import { MemberEntity } from "~/types/local/member";

class NetworkActionError extends Error {
	constructor(message: string, public statusCode: number) {
		super(message);
		this.name = "NetworkActionError";
	}
}

export async function getNetworkById(
	input: NetworkInput,
): Promise<NetworkAndMemberResponse> {
	try {
		// Validate input
		const parsedInput = networkInputSchema.parse(input);

		// Get session
		const session = await auth();
		if (!session?.user) {
			throw new NetworkActionError("Unauthorized", 401);
		}

		// Handle central network case
		if (parsedInput.central) {
			return await ztController.central_network_detail(
				session.user.id,
				parsedInput.nwid,
				parsedInput.central,
			);
		}

		// Get network from database
		const networkFromDatabase = await prisma.network.findUnique({
			where: {
				nwid: parsedInput.nwid,
			},
			include: {
				organization: true,
				routes: true,
			},
		});

		if (!networkFromDatabase) {
			throw new NetworkActionError("Network not found!", 404);
		}

		// Check permissions
		const isAuthor = networkFromDatabase.authorId === session.user.id;
		const isMemberOfOrganization = networkFromDatabase.organizationId
			? await prisma.organization.findFirst({
					where: {
						id: networkFromDatabase.organizationId,
						users: {
							some: { id: session.user.id },
						},
					},
			  })
			: null;

		if (!isAuthor && !isMemberOfOrganization) {
			throw new NetworkActionError("You do not have access to this network!", 403);
		}

		// Get network details from ZT controller
		const ztControllerResponse = await ztController
			.local_network_detail(session.user.id, networkFromDatabase.nwid, false)
			.catch((err) => {
				throw new NetworkActionError(`Controller error: ${err.message}`, 500);
			});

		if (!ztControllerResponse) {
			throw new NetworkActionError("Failed to get network details!", 500);
		}

		// Sync members and get statuses
		const membersWithStatusAndPeers = await syncMemberPeersAndStatus(
			{ prisma, session },
			parsedInput.nwid,
			ztControllerResponse.members,
		);

		// Get zombie members
		const zombieMembers = await fetchZombieMembers(
			parsedInput.nwid,
			ztControllerResponse.members,
		);

		// Generate CIDR options
		const { cidrOptions } = IPv4gen(null, []);

		// Merge members
		const mergedMembersMap = new Map();
		membersWithStatusAndPeers.forEach((member) => {
			mergedMembersMap.set(member.id, member);
		});

		// Get database members
		const databaseMembers = await prisma.network_members.findMany({
			where: {
				nwid: parsedInput.nwid,
				deleted: false,
			},
		});

		databaseMembers.forEach((member) => {
			if (!mergedMembersMap.has(member.id)) {
				mergedMembersMap.set(member.id, member);
			}
		});

		// Sync network routes
		await syncNetworkRoutes({
			networkId: parsedInput.nwid,
			networkFromDatabase,
			ztControllerRoutes: ztControllerResponse.network.routes,
		});

		// Check for duplicate routes
		let duplicateRoutes = [];
		const targetIPs = ztControllerResponse.network.routes.map((route) => route.target);

		if (targetIPs.length > 0 && !isMemberOfOrganization) {
			duplicateRoutes = await prisma.$queryRaw`
        SELECT 
          n."authorId",
          n."name",
          n."nwid",
          array_agg(
            json_build_object(
              'id', r."id",
              'target', r."target",
              'via', r."via"
            )
          ) as routes
        FROM "network" n
        INNER JOIN "Routes" r ON r."networkId" = n."nwid"
        WHERE n."authorId" = ${session.user.id}
          AND n."organizationId" IS NULL
          AND r."target" = ANY(${targetIPs}::text[])
          AND n."nwid" != ${parsedInput.nwid}
        GROUP BY n."authorId", n."name", n."nwid"
      `;
		}

		const duplicatedIPs = duplicateRoutes.flatMap((network) =>
			network.routes
				.filter((route) => targetIPs.includes(route.target))
				.map((route) => route.target),
		);

		const uniqueDuplicatedIPs = [...new Set(duplicatedIPs)];

		// Get final network state
		const updatedNetworkFromDatabase = await prisma.network.findUnique({
			where: {
				nwid: parsedInput.nwid,
			},
			include: {
				organization: true,
				routes: true,
			},
		});

		// Revalidate the network page
		// revalidatePath(`/network/${parsedInput.nwid}`);

		// Return final response
		return {
			network: {
				...ztControllerResponse?.network,
				...updatedNetworkFromDatabase,
				cidr: cidrOptions,
				duplicateRoutes: duplicateRoutes.map((network) => ({
					...network,
					duplicatedIPs: uniqueDuplicatedIPs,
				})),
			},
			members: Array.from(mergedMembersMap.values()) as MemberEntity[],
			zombieMembers,
		};
	} catch (error) {
		if (error instanceof NetworkActionError) {
			throw error;
		}

		console.error("Unexpected error in getNetworkById:", error);
		throw new NetworkActionError("An unexpected error occurred", 500);
	}
}
