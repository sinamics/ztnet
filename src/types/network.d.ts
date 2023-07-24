// Network
export interface NetworkAndMembers {
  network: ZtControllerNetwork;
  members?: MembersEntity[] | null;
}
export interface UserNetworkTable {
  authorId: number;
  autoAssignIp: boolean;
  capabilitiesByName: null;
  flowRule: null;
  ipAssignments: string;
  members: number; // dummy value used in table
  network_members: MembersEntity[];
  nwid: string;
  nwname: string;
  description: string;
  tagsByName: null;
}

export interface NetworkEntity {
  nwname?: string;
  autoAssignIp?: boolean;
  ipAssignments?: string;
  authorId?: number;
  description?: string;
}
export interface TagEnums {
  [key: string]: number;
}

export interface TagDetails {
  id: number;
  enums: TagEnums;
  flags: Record<string, unknown>; // replace 'unknown' with the appropriate type if you know it
  default: number | null;
}

export interface TagsByName {
  [tagName: string]: TagDetails;
}
export interface Tag {
  id: number;
  default: number;
  enums: Record<string, number>;
  flags: Record<string, unknown>; // replace 'unknown' with the appropriate type if you know it
}
export interface CapabilitiesByName {
  [key: string]: number;
}

export interface MembersEntity {
  action: string;
  activeBridge: boolean;
  name: string;
  email: string;
  emailVerified: boolean;
  online: boolean;
  role: string;
  address: string;
  authenticationExpiryTime: number;
  authorized: boolean;
  creationTime: DateTime;
  id: string;
  identity: string;
  ipAssignments?: string[];
  lastseen: DateTime;
  lastAuthorizedCredential?: null;
  lastAuthorizedCredentialType?: null;
  lastAuthorizedTime: number;
  lastDeauthorizedTime: number;
  noAutoAssignIps: boolean;
  nwid: string;
  objtype: string;
  remoteTraceLevel: number;
  remoteTraceTarget?: null;
  revision: number;
  ssoExempt: boolean;
  tags?: Tag;
  vMajor: number;
  vMinor: number;
  vProto: number;
  vRev: number;
  peers?: Peers;
  conStatus: number;
}

export interface dns {
  domain: string;
  servers: string[];
}
export interface ZtControllerNetwork {
  nwid: string;
  nwname: string;
  authorId: number;
  routes?: RoutesEntity[] | null;
  network_members?: NetworkMembersEntity[] | null;
  authTokens?: null[] | null;
  authorizationEndpoint: string;
  capabilities?: null[] | null;
  clientId: string;
  creationTime: DateTime;
  dns?: dns;
  enableBroadcast: boolean;
  id: string;
  ipAssignmentPools?: IpAssignmentPoolsEntity[] | null;
  mtu: number;
  multicastLimit: number;
  name: string;
  objtype: string;
  private: boolean;
  remoteTraceLevel: number;
  remoteTraceTarget?: null;
  revision: number;
  rules?: RulesEntity[] | null;
  rulesSource: string;
  ssoEnabled: boolean;
  tags?: Tag;
  v4AssignMode: V4AssignMode;
  v6AssignMode: V6AssignMode;
  cidr?: string[] | null;
  autoAssignIp: boolean;
  capabilitiesByName?: CapabilitiesByName;
  tagsByName?: TagsByName;
  description?: string;
}
export interface RoutesEntity {
  target?: string | null;
  via?: string | null;
}
export interface NetworkMembersEntity {
  nodeid: number;
  id: string;
  nwid: string;
  lastseen: DateTime;
  online: boolean;
  conStatus: number;
  deleted: boolean;
  name: string;
  activeBridge: boolean;
  address: string;
  authorized: boolean;
  creationTime: DateTime;
  identity: string;
  lastAuthorizedTime?: number;
  lastDeauthorizedTime?: number;
  objtype?: string;
  revision?: number;
  tags?: string[];
  vRev?: number;
  ipAssignments?: string[];
  noAutoAssignIps: boolean;
}
export interface IpAssignmentPoolsEntity {
  ipRangeEnd: string;
  ipRangeStart: string;
}
export interface RulesEntity {
  not: boolean;
  or: boolean;
  type: string;
}
export interface V4AssignMode {
  zt: boolean;
}
export interface V6AssignMode {
  "6plane": boolean;
  rfc4193: boolean;
  zt: boolean;
}
export interface Peers {
  active: boolean;
  address: string;
  isBonded: boolean;
  latency: number;
  lastReceive: number;
  lastSend: number;
  localSocket?: number;
  paths?: Paths[];
  role: string;
  version: string;
  physicalAddress: string;
  versionMajor: number;
  versionMinor: number;
  versionRev: number;
  preferred: boolean;
  trustedPathId: number;
}
export interface Paths {
  active: boolean;
  address: string;
  expired: boolean;
  lastReceive: number;
  lastSend: number;
  localSocket?: number;
  preferred: boolean;
  trustedPathId: number;
}
