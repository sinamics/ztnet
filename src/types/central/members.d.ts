import { type MemberEntity } from "../local/member";

interface CentralMemberConfig {
	activeBridge: boolean;
	address: string;
	authorized: boolean;
	capabilities: number[];
	creationTime: number;
	id: string;
	identity: string;
	ipAssignments: string[];
	lastAuthorizedTime: number;
	lastDeauthorizedTime: number;
	noAutoAssignIps: boolean;
	nwid: string;
	objtype: string;
	remoteTraceLevel: number;
	remoteTraceTarget: string;
	revision: number;
	tags: number[][];
	vMajor: number;
	vMinor: number;
	vRev: number;
	vProto: number;
	ssoExempt: boolean;
}

export interface FlattenCentralMembers extends MemberEntity, CentralMemberConfig {}

export interface CentralMemberEntity extends MemberEntity {
	description: string;
	totalMemberCount: number;
}
