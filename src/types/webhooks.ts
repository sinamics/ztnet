import { network_members } from "@prisma/client";
import { NetworkEntity } from "./local/network";
import { MemberEntity } from "./local/member";

// Define Hook Types
export enum HookType {
	// UNKNOWN = "UNKNOWN",
	NETWORK_JOIN = "NETWORK_JOIN",
	// NETWORK_AUTH = "NETWORK_AUTH",
	// NETWORK_DEAUTH = "NETWORK_DEAUTH",
	// NETWORK_SSO_LOGIN = "NETWORK_SSO_LOGIN",
	// NETWORK_SSO_LOGIN_ERROR = "NETWORK_SSO_LOGIN_ERROR",
	NETWORK_CREATED = "NETWORK_CREATED",
	NETWORK_CONFIG_CHANGED = "NETWORK_CONFIG_CHANGED",
	NETWORK_DELETED = "NETWORK_DELETED",
	MEMBER_CONFIG_CHANGED = "MEMBER_CONFIG_CHANGED",
	MEMBER_DELETED = "MEMBER_DELETED",
	// ORG_INVITE_SENT = "ORG_INVITE_SENT",
	// ORG_INVITE_ACCEPTED = "ORG_INVITE_ACCEPTED",
	// ORG_INVITE_REJECTED = "ORG_INVITE_REJECTED",
	ORG_MEMBER_REMOVED = "ORG_MEMBER_REMOVED",
}

export interface HookBase {
	organizationId: string;
	hookType: HookType;
}

export interface MemberConfigChanged extends HookBase {
	networkId: string;
	memberId: string;
	userId: string;
	userEmail: string;
	changes: Partial<MemberEntity>;
}

export interface MemberJoined extends HookBase {
	networkId: string;
	memberId: string;
}

export interface NetworkMemberAuth extends HookBase {
	networkId: string;
	memberId: string;
	userId: string;
	userEmail: string;
	memberMetadata: Record<string, Partial<network_members>>;
}

export interface MemberDeleted extends HookBase {
	networkId: string;
	userId: string;
	userEmail: string;
	deletedMemberId: string;
}

export interface OrgMemberRemoved extends HookBase {
	userId: string;
	userEmail: string;
	removedUserId: string;
	removedUserEmail: string;
}

export interface NetworkConfigChanged extends HookBase {
	networkId: string;
	userId: string;
	userEmail: string;
	changes: Partial<NetworkEntity>;
}
export interface NetworkMemberDeauth extends HookBase {
	networkId: string;
	memberId: string;
	userId: string;
	userEmail: string;
	memberMetadata: Record<string, Partial<network_members>>;
}

export interface NetworkDeleted extends HookBase {
	networkId: string;
	userId: string;
	userEmail: string;
}

export interface NetworkCreated extends HookBase {
	networkId: string;
	userId: string;
	userEmail: string;
}
