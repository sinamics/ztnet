"use server";

import { auth } from "~/server/auth";
import {
	type UpdateNetworkInputType,
	updateNetworkSchema,
} from "../../schemas/updateNetwork";
import { checkUserOrganizationRole } from "~/utils/role";
import { Role } from "@prisma/client";
import { prisma } from "~/server/db";
import * as ztController from "~/utils/ztApi";
import { sendWebhook } from "~/utils/webhook";
import { z } from "zod";
import type { CentralNetwork } from "~/types/central/network";
import { HookType, type NetworkConfigChanged } from "~/types/webhooks";
import { WebSocketManager } from "~/lib/websocketMangager";

class NetworkActionError extends Error {
	constructor(
		message: string,
		public statusCode: number,
	) {
		super(message);
		this.name = "NetworkActionError";
	}
}

export async function server_updateNetworkName(input: UpdateNetworkInputType) {
	try {
		// 1. Validate input
		const validatedInput = updateNetworkSchema.parse(input);

		// 2. Get session
		const session = await auth();
		if (!session?.user) {
			throw new NetworkActionError("Unauthorized", 401);
		}

		// 3. Check organization permissions if needed
		if (validatedInput.organizationId) {
			await checkUserOrganizationRole({
				organizationId: validatedInput.organizationId,
				userId: session.user.id,
				minimumRequiredRole: Role.USER,
			});
		}

		// 4. Log the action first (in case update fails)
		await prisma.activityLog.create({
			data: {
				action: `Changed network ${validatedInput.nwid} name to ${validatedInput.updateParams.name}`,
				performedById: session.user.id,
				organizationId: validatedInput.organizationId || null,
			},
		});

		// 5. Prepare update parameters based on central flag
		const updateParams = validatedInput.central
			? { config: { ...validatedInput.updateParams } }
			: { ...validatedInput.updateParams };

		// 6. Update the network
		const updated = await ztController.network_update({
			userId: session?.user.id,
			nwid: validatedInput.nwid,
			central: validatedInput.central,
			updateParams,
		});

		// 7. Handle central network response
		if (validatedInput.central) {
			const { id: nwid, config, ...otherProps } = updated as CentralNetwork;
			return { nwid, ...config, ...otherProps } as Partial<CentralNetwork>;
		}

		// 8. Update local database
		const updatedData = await prisma.network.update({
			where: { nwid: validatedInput.nwid },
			data: {
				...validatedInput.updateParams,
			},
		});

		// 9. Send webhook
		try {
			await sendWebhook<NetworkConfigChanged>({
				hookType: HookType.NETWORK_CONFIG_CHANGED,
				organizationId: validatedInput.organizationId || "",
				userId: session.user.id,
				userEmail: session.user.email,
				networkId: validatedInput.nwid,
				changes: validatedInput.updateParams,
			});
		} catch (webhookError) {
			console.error("Webhook failed:", webhookError);
			// Continue even if webhook fails
		}

		try {
			const wsManager = WebSocketManager.getInstance();
			await wsManager.notifyNetworkUpdate(validatedInput.nwid);
		} catch (error) {
			console.error("WebSocket notification failed:", error);
		}
		return updatedData;
	} catch (error) {
		if (error instanceof z.ZodError) {
			throw new NetworkActionError(`Validation error: ${error.message}`, 400);
		}

		if (error instanceof NetworkActionError) {
			throw error;
		}

		console.error("Unexpected error in updateNetworkName:", error);
		throw new NetworkActionError(
			"An unexpected error occurred while updating the network name",
			500,
		);
	}
	// revalidatePath("/network/[id]", "page");
}
