"use server";

import { z } from "zod";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { HookType, NetworkDeleted } from "~/types/webhooks";
import { prisma } from "~/server/db";
import { auth } from "~/server/auth";
import * as ztController from "~/utils/ztApi";
import { checkUserOrganizationRole } from "~/utils/role";
import { sendWebhook } from "~/utils/webhook";
import { DeleteNetworkInputType, deleteNetworkSchema } from "../../schemas/deleteNetwork";

class DeleteNetworkError extends Error {
	constructor(message: string, public statusCode: number, public code?: string) {
		super(message);
		this.name = "DeleteNetworkError";
	}
}

export async function deleteNetwork(input: DeleteNetworkInputType) {
	try {
		// 1. Validate input
		const validatedInput = deleteNetworkSchema.parse(input);

		// 2. Get session
		const session = await auth();
		if (!session?.user) {
			throw new DeleteNetworkError("Unauthorized", 401, "UNAUTHORIZED");
		}

		// 3. Check organization permissions if needed
		if (validatedInput.organizationId) {
			await checkUserOrganizationRole({
				organizationId: validatedInput.organizationId,
				userId: session.user.id,
				minimumRequiredRole: Role.USER,
			});
		}

		// 4. Start deletion process
		// De-authorize all members first
		const members = await ztController.network_members(
			session?.user.id,
			validatedInput.nwid,
			validatedInput.central,
		);

		// De-authorize members in parallel
		await Promise.all(
			Object.keys(members).map((memberId) =>
				ztController.member_update({
					userId: session?.user.id,
					nwid: validatedInput.nwid,
					central: validatedInput.central,
					memberId,
					updateParams: { authorized: false },
				}),
			),
		);

		// 5. Delete ZT network
		await ztController.network_delete(
			session?.user.id,
			validatedInput.nwid,
			validatedInput.central,
		);

		// 6. Delete from database based on context
		if (!validatedInput.central && validatedInput.organizationId) {
			// Delete from organization
			await prisma.network.deleteMany({
				where: {
					organizationId: validatedInput.organizationId,
					nwid: validatedInput.nwid,
				},
			});
		} else if (!validatedInput.organizationId) {
			// Delete user's personal network
			await prisma.network.deleteMany({
				where: {
					authorId: session.user.id,
					nwid: validatedInput.nwid,
				},
			});
		}

		// 7. Log the action
		await prisma.activityLog.create({
			data: {
				action: `Deleted network ${validatedInput.nwid}`,
				performedById: session.user.id,
				organizationId: validatedInput.organizationId || null,
			},
		});

		// 8. Send webhook
		try {
			await sendWebhook<NetworkDeleted>({
				hookType: HookType.NETWORK_DELETED,
				organizationId: validatedInput.organizationId || "",
				userId: session.user.id,
				userEmail: session.user.email,
				networkId: validatedInput.nwid,
			});
		} catch (webhookError) {
			console.error("Webhook failed:", webhookError);
			// Continue with deletion even if webhook fails
		}
	} catch (error) {
		if (error instanceof z.ZodError) {
			throw new DeleteNetworkError(
				`Validation error: ${error.message}`,
				400,
				"VALIDATION_ERROR",
			);
		}

		if (error instanceof DeleteNetworkError) {
			throw error;
		}

		console.error("Unexpected error in deleteNetwork:", error);
		throw new DeleteNetworkError(
			"An unexpected error occurred while deleting the network",
			500,
			"INTERNAL_SERVER_ERROR",
		);
	}

	// redirect to network page
	redirect("/network");
}
