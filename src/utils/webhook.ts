// Define Hook Types
export enum HookType {
	UNKNOWN = "UNKNOWN",
	NETWORK_JOIN = "NETWORK_JOIN",
	NETWORK_AUTH = "NETWORK_AUTH",
	NETWORK_DEAUTH = "NETWORK_DEAUTH",
	NETWORK_SSO_LOGIN = "NETWORK_SSO_LOGIN",
	NETWORK_SSO_LOGIN_ERROR = "NETWORK_SSO_LOGIN_ERROR",
	NETWORK_CREATED = "NETWORK_CREATED",
	NETWORK_CONFIG_CHANGED = "NETWORK_CONFIG_CHANGED",
	NETWORK_DELETED = "NETWORK_DELETED",
	MEMBER_CONFIG_CHANGED = "MEMBER_CONFIG_CHANGED",
	MEMBER_DELETED = "MEMBER_DELETED",
	ORG_INVITE_SENT = "ORG_INVITE_SENT",
	ORG_INVITE_ACCEPTED = "ORG_INVITE_ACCEPTED",
	ORG_INVITE_REJECTED = "ORG_INVITE_REJECTED",
	ORG_MEMBER_REMOVED = "ORG_MEMBER_REMOVED",
}
// Define the base structure for all webhooks
interface HookBase {
	organizationId: string;
	hookType: HookType;
}

interface NetworkConfigChanged extends HookBase {
	networkId: string;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	memberMetadata: Record<string, any>;
}

// Define specific webhook event structures
interface NewMemberJoined extends HookBase {
	networkId: string;
	memberId: string;
}

interface NetworkMemberAuth extends HookBase {
	networkId: string;
	memberId: string;
	userId: string;
	userEmail: string;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	memberMetadata: Record<string, any>;
}

// Example: NetworkMemberDeauth
interface NetworkMemberDeauth extends HookBase {
	networkId: string;
	memberId: string;
	userId: string;
	userEmail: string;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	memberMetadata: Record<string, any>;
}

// Generic function to send a webhook
async function sendWebhook<T extends HookBase>(
	event: T,
	webhookUrl: string,
): Promise<void> {
	try {
		const response = await fetch(webhookUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(event),
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

// Export the types and function if needed elsewhere
export { sendWebhook };
export type {
	HookBase,
	NewMemberJoined,
	NetworkMemberAuth,
	NetworkMemberDeauth,
	NetworkConfigChanged,
};
