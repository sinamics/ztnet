"use server";

import {
	type Config,
	adjectives,
	animals,
	uniqueNamesGenerator,
} from "unique-names-generator";
import { auth } from "~/server/auth";
import { prisma } from "~/server/db";
import { CustomLimitError } from "~/server/helpers/errorHandler";
import { FlattenCentralNetwork } from "~/types/central/network";
import { ZTControllerCreateNetwork } from "~/types/ztController";
import { IPv4gen } from "~/utils/IPv4gen";
import * as ztController from "~/utils/ztApi";
import { CreateNetworkInputType, createNetworkSchema } from "../../schemas/createNetwork";

// Name generator config
const nameGeneratorConfig: Config = {
	dictionaries: [adjectives, animals],
	separator: "-",
	length: 2,
};

/**
 * Creates a new ZeroTier network
 */
export async function createNetwork(
	input: CreateNetworkInputType,
): Promise<FlattenCentralNetwork | ZTControllerCreateNetwork | undefined> {
	// Validate session
	const session = await auth();
	if (!session) {
		throw new Error("Unauthorized");
	}

	// Validate input
	const validatedInput = createNetworkSchema.parse(input);

	try {
		// 1. Fetch the user with its related UserGroup
		const userWithGroup = await prisma.user.findUnique({
			where: { id: session.user.id },
			select: {
				userGroup: true,
			},
		});

		if (userWithGroup?.userGroup) {
			// 2. Check network limit
			const currentNetworksCount = await prisma.network.count({
				where: { authorId: session.user.id },
			});

			const networkLimit = userWithGroup.userGroup.maxNetworks;
			if (currentNetworksCount >= networkLimit) {
				throw new CustomLimitError(
					"You have reached the maximum number of networks allowed for your user group.",
				);
			}
		}

		// 3. Get used IPs from database
		const usedCidr = await prisma.network.findMany({
			where: {
				authorId: session.user.id,
			},
			select: {
				routes: true,
			},
		});

		// Extract and flatten used IPs
		const usedIPs = usedCidr.map((nw) => nw.routes?.map((r) => r.target));

		// Generate IP assignment pools
		const ipAssignmentPools = IPv4gen(null, usedIPs, validatedInput.central);

		// Generate network name if not provided
		const networkName = validatedInput.name || uniqueNamesGenerator(nameGeneratorConfig);

		// Create ZeroTier network
		const newNetwork = await ztController.network_create(
			session.user.id,
			networkName,
			ipAssignmentPools,
			validatedInput.central,
		);

		if (validatedInput.central) {
			return newNetwork;
		}

		// Store network in database
		await prisma.user.update({
			where: {
				id: session.user.id,
			},
			data: {
				network: {
					create: {
						name: newNetwork.name,
						nwid: newNetwork.nwid,
						routes: {
							create: ipAssignmentPools.routes.map((route) => ({
								target: route.target,
								via: route.via,
							})),
						},
					},
				},
			},
			select: {
				network: true,
			},
		});

		return newNetwork;
	} catch (error) {
		if (error instanceof CustomLimitError) {
			throw new Error(error.message);
		}
		if (error instanceof Error) {
			console.error(error);
			throw new Error("Could not create network! Please try again");
		}

		throw new Error("An unknown error occurred");
	}
}

// Export types for use in components
export type NetworkResponse = Awaited<ReturnType<typeof createNetwork>>;
