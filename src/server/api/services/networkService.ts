import { uniqueNamesGenerator } from "unique-names-generator";
import { CustomLimitError, throwError } from "~/server/helpers/errorHandler";
import { IPv4gen } from "~/utils/IPv4gen";
import { customConfig } from "../routers/networkRouter";
import * as ztController from "~/utils/ztApi";

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
