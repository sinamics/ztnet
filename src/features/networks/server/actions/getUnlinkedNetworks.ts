"use server";

import { z } from "zod";
import { auth } from "~/server/auth";
import { prisma } from "~/server/db";
import { throwError } from "~/server/helpers/errorHandler";
import type { NetworkAndMemberResponse } from "~/types/network";
import * as ztController from "~/utils/ztApi";

// Input validation schema
const unlinkedNetworkSchema = z.object({
	getDetails: z.boolean().optional(),
});

// Type for the function input
type UnlinkedNetworkInput = z.infer<typeof unlinkedNetworkSchema>;

export async function getUnlinkedNetworks(input: UnlinkedNetworkInput) {
	// Validate session and admin role
	const session = await auth();
	if (!session) {
		throw new Error("Unauthorized");
	}
	if (session.user.role !== "ADMIN") {
		throw new Error("Forbidden: Admin access required");
	}

	// Validate input
	const validatedInput = unlinkedNetworkSchema.parse(input);

	try {
		// Get networks from ZeroTier controller
		const ztNetworks = (await ztController.get_controller_networks(
			session.user.id,
			false,
		)) as string[];

		// Get networks from database
		const dbNetworks = await prisma.network.findMany({
			select: { nwid: true },
		});

		// Create a set of nwid for faster lookup
		const dbNetworkIds = new Set(dbNetworks.map((network) => network.nwid));

		// Find networks that are not in database
		const unlinkedNetworks = ztNetworks.filter(
			(networkId) => !dbNetworkIds.has(networkId),
		);

		if (unlinkedNetworks.length === 0) {
			return [];
		}

		// If details are requested, fetch them
		if (validatedInput.getDetails) {
			const unlinkArr: NetworkAndMemberResponse[] = await Promise.all(
				unlinkedNetworks.map((unlinked) =>
					ztController.ZTApiGetNetworkInfo(session.user.id, unlinked, false),
				),
			);
			return unlinkArr;
		}

		return unlinkedNetworks;
	} catch (error) {
		return throwError("Failed to fetch unlinked networks", error);
	}
}

// Export type for use in components
export type UnlinkedNetworks = Awaited<ReturnType<typeof getUnlinkedNetworks>>;
