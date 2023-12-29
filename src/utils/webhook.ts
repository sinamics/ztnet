import { prisma } from "~/server/db";
import { HookBase } from "~/types/webhooks";

// Generic function to send a webhook
export const sendWebhook = async <T extends HookBase>(data: T): Promise<void> => {
	if (!data?.organizationId) return;

	const webhookData = await prisma.webhook.findMany({
		where: { organizationId: data.organizationId },
	});

	for (const webhook of webhookData) {
		if ((webhook.eventTypes as string[]).includes(data.hookType)) {
			try {
				const response = await fetch(webhook.url, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(data),
				});

				if (!response.ok) {
					throw new Error(
						`Failed to send webhook: ${response.status} ${response.statusText}`,
					);
				}
			} catch (error) {
				throw new Error(`Error sending webhook: ${error.message}`);
			}
		}
	}
};
