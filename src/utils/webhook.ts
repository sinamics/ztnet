import { prisma } from "~/server/db";
import { HookBase, HookType } from "~/types/webhooks";

// Generic function to send a webhook
export const sendWebhook = async <T extends HookBase>({
	hookType,
	webhookUrl,
	organizationId,
	content,
}: {
	hookType: string;
	webhookUrl: string;
	organizationId: string;
	content: any;
}): Promise<void> => {
	const webhookData = await prisma.webhook.findMany({
		where: {
			organizationId,
		},
	});

	const hookContent = {
		...content,
		hookType,
	};

	for (const webhook of webhookData) {
		if (!(webhook.eventTypes as string[]).includes(hookType)) return;

		try {
			const response = await fetch(webhook.url, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(content),
			});

			if (!response.ok) {
				throw new Error(
					`Failed to send webhook: ${response.status} ${response.statusText}`,
				);
			}
			console.warn("Webhook sent successfully");
		} catch (error) {
			console.error("Error sending webhook:", error);
		}
	}
};

// // Export the types and function if needed elsewhere
// export type {
// 	HookBase,
// 	NewMemberJoined,
// 	NetworkMemberAuth,
// 	NetworkMemberDeauth,
// 	NetworkConfigChanged,
// };
