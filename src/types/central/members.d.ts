import { type Notation } from "../local/member";

export interface CentralMembers {
	id: string;
	type: string;
	clock: number;
	networkId: string;
	nodeId: string;
	controllerId: string;
	hidden: boolean;
	name: string;
	description: string;
	config?: CentralMemberConfig;
	lastOnline: number;
	lastSeen?: number;
	physicalAddress: string;
	physicalLocation: null | string; // Assuming this can be string in some cases
	clientVersion: string;
	protocolVersion: number;
	supportsRulesEngine: boolean;
	notations?: Notation[];
	totalMemberCount: number;
}

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

export interface FlattenCentralMembers
	extends CentralMembers,
		CentralMemberConfig {}
