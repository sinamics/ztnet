import { uniqueNamesGenerator } from "unique-names-generator";
import { CustomLimitError, throwError } from "~/server/helpers/errorHandler";
import { type Config, adjectives, animals } from "unique-names-generator";
import { IPv4gen } from "~/utils/IPv4gen";
import * as ztController from "~/utils/ztApi";

/**
 * Configuration object for new network name.
 */
export const nameGeneratorConfig: Config = {
	dictionaries: [adjectives, animals],
	separator: "-",
	length: 2,
};

/**
 * Creates a network service.
 * @param {Object} ctx - The context object.
 * @param {Object} input - The input object.
 * @returns {Promise<Object>} - The created network service.
 * @throws {CustomLimitError} - If the user has reached the maximum number of networks allowed for their user group.
 * @throws {Error} - If an error occurs while creating the network service.
 */
export const networkProvisioningFactory = async ({ ctx, input }) => {
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
		// get used IPs from the database
		const usedCidr = await ctx.prisma.network.findMany({
			where: {
				authorId: ctx.session.user.id,
			},
			select: {
				routes: true,
			},
		});
		// Extract the target from the routes
		const usedIPs = usedCidr.map((nw) => nw.routes?.map((r) => r.target));

		// Flatten the array
		// Generate ipv4 address, cidr, start & end
		const ipAssignmentPools = IPv4gen(null, usedIPs);

		if (!input?.name) {
			// Generate adjective and noun word
			input.name = uniqueNamesGenerator(nameGeneratorConfig);
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
						routes: ipAssignmentPools.routes,
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
