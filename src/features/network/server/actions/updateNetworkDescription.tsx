"use server";

import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "~/server/db";
import { auth } from "~/server/auth";
import { checkUserOrganizationRole } from "~/utils/role";
import * as ztController from "~/utils/ztApi";
import { HookType } from "~/types/webhooks";
import { sendWebhook } from "~/utils/webhook";
import { updateParamsSchema } from "../../schemas/updateNetworkDescription";
import { WebSocketManager } from "~/lib/websocketMangager";

export async function updateNetworkDescription(formData: FormData) {
	const session = await auth();
	if (!session) throw new Error("Unauthorized");

	const parsed = updateParamsSchema.safeParse({
		nwid: formData.get("nwid"),
		central: formData.get("central") === "true",
		organizationId: formData.get("organizationId"),
		description: formData.get("description"),
	});

	if (!parsed.success) {
		throw new Error("Invalid input");
	}

	const { nwid, central, organizationId, description } = parsed.data;

	// Log the action
	await prisma.activityLog.create({
		data: {
			action: `Changed network ${nwid} description to ${description}`,
			performedById: session.user.id,
			organizationId: organizationId || null,
		},
	});

	// Check organization permissions
	if (organizationId) {
		await checkUserOrganizationRole({
			userId: session.user.id,
			organizationId,
			minimumRequiredRole: Role.USER,
		});
	}

	let updatedDescription: string;

	if (central) {
		const updated = await ztController.network_update({
			userId: session.user.id,
			nwid,
			central,
			updateParams: { description },
		});
		updatedDescription = updated.description;
	} else {
		const updated = await prisma.network.update({
			where: { nwid },
			data: { description },
		});
		updatedDescription = updated.description;
	}

	try {
		await sendWebhook({
			hookType: HookType.NETWORK_CONFIG_CHANGED,
			organizationId,
			userId: session.user.id,
			userEmail: session.user.email,
			networkId: nwid,
			changes: { description },
		});
	} catch (error) {
		console.error("Webhook failed:", error);
	}

	try {
		const wsManager = WebSocketManager.getInstance();
		await wsManager.notifyNetworkUpdate(nwid);
	} catch (error) {
		console.error("WebSocket notification failed:", error);
	}
	revalidatePath(`/networks/${nwid}`);
	return { description: updatedDescription };
}
