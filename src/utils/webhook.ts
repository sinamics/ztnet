import { request as httpsRequest } from "node:https";
import { prisma } from "~/server/db";
import { HookBase } from "~/types/webhooks";
import { PinnedTarget, resolvePublicTarget } from "~/utils/ssrfGuard";

const WEBHOOK_TIMEOUT_MS = 10_000;

/**
 * Delivers the payload to an already validated target.
 *
 * The request goes to the address `resolvePublicTarget` checked, not to the
 * hostname, so a second DNS answer cannot swap in an internal address after the
 * check (DNS rebinding). Redirects are never followed, node's http client does
 * not follow them, which also closes the "redirect to an internal http target"
 * bypass. The response body is drained and never inspected.
 */
const deliver = (target: PinnedTarget, body: string) =>
	new Promise<{ status: number; statusText: string }>((resolve, reject) => {
		const req = httpsRequest(
			{
				host: target.address,
				family: target.family,
				port: target.url.port || 443,
				path: `${target.url.pathname}${target.url.search}`,
				method: "POST",
				// connect to the pinned address, but keep validating the certificate
				// against the hostname the admin configured
				servername: target.address === target.hostname ? undefined : target.hostname,
				headers: {
					"Content-Type": "application/json",
					Host: target.url.host,
					"Content-Length": Buffer.byteLength(body),
				},
				timeout: WEBHOOK_TIMEOUT_MS,
			},
			(res) => {
				res.resume();
				resolve({
					status: res.statusCode ?? 0,
					statusText: res.statusMessage ?? "",
				});
			},
		);

		req.on("timeout", () => {
			req.destroy(new Error(`Webhook request timed out after ${WEBHOOK_TIMEOUT_MS}ms`));
		});
		req.on("error", reject);
		req.end(body);
	});

// Generic function to send a webhook
export const sendWebhook = async <T extends HookBase>(data: T): Promise<void> => {
	if (!data?.organizationId) return;

	const webhookData = await prisma.webhook.findMany({
		where: { organizationId: data.organizationId },
	});

	for (const webhook of webhookData) {
		if ((webhook.eventTypes as string[]).includes(data.hookType)) {
			(async () => {
				try {
					const target = await resolvePublicTarget(webhook.url);
					const response = await deliver(target, JSON.stringify(data));

					if (response.status < 200 || response.status >= 300) {
						console.error(
							`Failed to send webhook: ${response.status} ${response.statusText}`,
						);
					}
				} catch (error) {
					console.error(`Error sending webhooks: ${error.message}`);
				}
			})();
		}
	}
};
