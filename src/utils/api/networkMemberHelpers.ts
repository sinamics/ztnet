import { type PrismaClient, network_members } from "@prisma/client";
import * as ztController from "~/utils/ztApi";

/**
 * Configuration for updateable fields in network member updates
 */
export interface UpdateableField {
	type: string;
	destinations: ("database" | "controller")[];
}

export interface UpdateableFieldsConfig {
	[key: string]: UpdateableField;
}

/**
 * Splits update payload into database and controller payloads based on field configuration
 *
 * @param validatedInput - The validated input data from the request
 * @param updateableFields - Configuration of fields and their destinations
 * @returns Object containing databasePayload and controllerPayload
 */
export function splitUpdatePayload(
	validatedInput: Record<string, unknown>,
	updateableFields: UpdateableFieldsConfig,
) {
	const databasePayload: Partial<network_members> = {};
	const controllerPayload: Partial<network_members> = {};

	// Iterate over keys in the request body
	for (const [key, value] of Object.entries(validatedInput)) {
		if (updateableFields[key].destinations.includes("database")) {
			databasePayload[key] = value;
		}
		if (updateableFields[key].destinations.includes("controller")) {
			controllerPayload[key] = value;
		}
	}

	return { databasePayload, controllerPayload };
}

/**
 * Updates network member in the database
 *
 * @param ctx - The context object with prisma client
 * @param networkId - The network ID
 * @param memberId - The member ID
 * @param databasePayload - The data to update in the database
 */
export async function updateNetworkMemberInDatabase(
	ctx: { prisma: PrismaClient },
	networkId: string,
	memberId: string,
	databasePayload: Partial<network_members>,
) {
	if (Object.keys(databasePayload).length === 0) {
		return;
	}

	await ctx.prisma.network.update({
		where: {
			nwid: networkId,
		},
		data: {
			networkMembers: {
				update: {
					where: {
						id_nwid: {
							id: memberId,
							nwid: networkId,
						},
					},
					data: {
						...databasePayload,
					},
				},
			},
		},
		select: {
			networkMembers: {
				where: {
					id: memberId,
				},
			},
		},
	});
}

/**
 * Updates network member in the controller
 *
 * @param ctx - The context object
 * @param networkId - The network ID
 * @param memberId - The member ID
 * @param controllerPayload - The data to update in the controller
 */
export async function updateNetworkMemberInController(
	ctx: { prisma: PrismaClient },
	networkId: string,
	memberId: string,
	controllerPayload: Partial<network_members>,
) {
	if (Object.keys(controllerPayload).length === 0) {
		return;
	}

	await ztController.member_update({
		// @ts-expect-error - ctx type compatibility
		ctx,
		nwid: networkId,
		memberId: memberId,
		// @ts-expect-error - updateParams type compatibility
		updateParams: controllerPayload,
	});
}
