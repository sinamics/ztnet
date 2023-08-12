// Network Related Types
export interface NetworkEntity {
	name?: string;
	nwid: string;
	objtype: string;
	private?: boolean;
	description?: string;
	remoteTraceLevel?: number;
	remoteTraceTarget?: null;
	revision?: number;
	tags?: Tag[];
	v4AssignMode: V4AssignMode;
	v6AssignMode: V6AssignMode;
	authTokens?: null;
	authorizationEndpoint?: string;
	capabilities?: Capability[];
	clientId?: string;
	creationTime?: number;
	dns?: dns;
	enableBroadcast?: boolean;
	id: string;
	ipAssignmentPools?: IpAssignmentPoolsEntity[];
	mtu?: number;
	multicastLimit?: number;
	routes: RoutesEntity[];
	rules?: RulesEntity[];
	rulesSource?: string;
	ssoEnabled?: boolean;
	cidr?: string[];
	tagsByName?: TagsByName;
	capabilitiesByName?: CapabilitiesByName;
	config?: Partial<NetworkConfig>;
}

interface NetworkConfig {
	authTokens?: null;
	creationTime?: number;
	capabilities?: Capability[];
	enableBroadcast: boolean;
	id: string;
	ipAssignmentPools: IpAssignmentPool[];
	lastModified: number;
	mtu: number;
	multicastLimit?: number;
	name: string;
	private: boolean;
	remoteTraceLevel: number;
	remoteTraceTarget: string;
	routes: Route[];
	rules: Rule[];
	tags: Tag[];
	v4AssignMode: V4AssignMode;
	v6AssignMode: V6AssignMode;
	dns: { domain?: string; servers?: string[] };
	ssoConfig: { enabled: boolean; mode: string };
}

interface CapabilitiesByName {
	[key: string]: number;
}
interface TagsByName {
	[tagName: string]: TagDetails;
	id?: number;
}
interface TagDetails {
	id: number;
	enums: TagEnums;
	flags: Record<string, unknown>; // replace 'unknown' with the appropriate type if you know it
	default: number | null;
}
interface TagEnums {
	[key: string]: number;
}
export interface RoutesEntity {
	target?: string | null;
	via?: string | null;
}

export interface dns {
	domain?: string;
	servers?: string[];
}

export interface IpAssignmentPoolsEntity {
	ipRangeEnd?: string;
	ipRangeStart?: string;
}

export interface RulesEntity {
	not: boolean;
	or: boolean;
	type: string;
}

export interface V4AssignMode {
	zt?: boolean;
}

export interface V6AssignMode {
	"6plane": boolean;
	rfc4193: boolean;
	zt: boolean;
}
