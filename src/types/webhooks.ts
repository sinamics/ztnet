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

export interface HookBase {
	organizationId: string;
	hookType: HookType;
}

export interface NetworkConfigChanged extends HookBase {
	networkId: string;
	content: string | boolean;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	memberMetadata: Record<string, any>;
}

// Define specific webhook event structures
export interface NewMemberJoined extends HookBase {
	networkId: string;
	memberId: string;
}

export interface NetworkMemberAuth extends HookBase {
	networkId: string;
	memberId: string;
	userId: string;
	userEmail: string;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	memberMetadata: Record<string, any>;
}

// Example: NetworkMemberDeauth
export interface NetworkMemberDeauth extends HookBase {
	networkId: string;
	memberId: string;
	userId: string;
	userEmail: string;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	memberMetadata: Record<string, any>;
}
