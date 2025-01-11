"use server";

import { Role } from "@prisma/client";
import { z } from "zod";
import { auth } from "~/server/auth";
import { prisma } from "~/server/db";
import { throwError } from "~/server/helpers/errorHandler";
import { checkUserOrganizationRole } from "~/utils/role";
import { sendWebhook } from "~/utils/webhook";
import type { CentralNetwork } from "~/types/central/network";
import type { NetworkEntity } from "~/types/local/network";
import { type NetworkConfigChanged, HookType } from "~/types/webhooks";
import * as ztController from "~/utils/ztApi";
import { WebSocketManager } from "~/lib/websocketMangager";

// Input validation schema
const updateNetworkPrivacySchema = z.object({
	nwid: z.string(),
	central: z.boolean().optional().default(false),
	organizationId: z.string().optional(),
	updateParams: z.object({
		private: z.boolean(),
	}),
});

export async function updateNetworkPrivacy(
	input: z.infer<typeof updateNetworkPrivacySchema>,
) {
	// Validate input
	const validatedInput = updateNetworkPrivacySchema.parse(input);

	// Get session
	const session = await auth();
	if (!session?.user) {
		throw new Error("Unauthorized");
	}

	try {
		// Log the action
		await prisma.activityLog.create({
			data: {
				action: `Changed network ${validatedInput.nwid} privacy to ${validatedInput.updateParams.private}`,
				performedById: session.user.id,
				organizationId: validatedInput?.organizationId || null,
			},
		});

		// Check organization permissions if organizationId is provided
		if (validatedInput.organizationId) {
			await checkUserOrganizationRole({
				userId: session.user.id,
				organizationId: validatedInput.organizationId,
				minimumRequiredRole: Role.USER,
			});
		}

		// Prepare update parameters based on central flag
		const updateParams = validatedInput.central
			? { config: { private: validatedInput.updateParams.private } }
			: { private: validatedInput.updateParams.private };

		// Update network
		const updated = await ztController.network_update({
			userId: session.user.id,
			nwid: validatedInput.nwid,
			central: validatedInput.central,
			updateParams,
		});

		// Handle central network response
		if (validatedInput.central) {
			const { id: nwid, config, ...otherProps } = updated as CentralNetwork;
			return { nwid, ...config, ...otherProps } as Partial<CentralNetwork>;
		}

		// Send webhook
		try {
			await sendWebhook<NetworkConfigChanged>({
				hookType: HookType.NETWORK_CONFIG_CHANGED,
				organizationId: validatedInput?.organizationId,
				userId: session.user.id,
				userEmail: session.user.email,
				networkId: validatedInput.nwid,
				changes: validatedInput.updateParams,
			});
		} catch (error) {
			throwError(`Failed to send webhook: ${error.message}`);
		}

		try {
			const wsManager = WebSocketManager.getInstance();
			await wsManager.notifyNetworkUpdate(validatedInput.nwid);
		} catch (error) {
			console.error("WebSocket notification failed:", error);
		}

		return updated as NetworkEntity;
	} catch (error) {
		throw new Error(`Failed to update network privacy: ${error.message}`);
	}
}
