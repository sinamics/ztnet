import { type MembersEntity, type ZtControllerNetwork } from "./network";

/* 
  Node status and addressing info
  https://docs.zerotier.com/service/v1/#operation/getStatus
*/
export interface ZTControllerNodeStatus {
  address: string;
  clock: number;
  config: Config;
  online: boolean;
  planetWorldId: number;
  planetWorldTimestamp: number;
  publicIdentity: string;
  tcpFallbackActive: boolean;
  version: string;
  versionBuild: number;
  versionMajor: number;
  versionMinor: number;
  versionRev: number;
}

export interface Config {
  settings: Settings;
}

export interface Settings {
  allowManagementFrom: null[];
  allowTcpFallbackRelay: boolean;
  forceTcpRelay: boolean;
  listeningOn: null[];
  portMappingEnabled: boolean;
  primaryPort: number;
  secondaryPort: number;
  softwareUpdate: string;
  softwareUpdateChannel: string;
  surfaceAddresses: null[];
  tertiaryPort: number;
}

// Check for controller function and return controller status.
// https://docs.zerotier.com/service/v1/#operation/getControllerStatus
export interface ZTControllerStatus {
  controller: boolean;
  apiVersion: number;
  clock: number;
}

/* 
  Create new zerotier network
  https://docs.zerotier.com/service/v1/#operation/createNetwork
*/
export interface ZTControllerCreateNetwork {
  id: string;
  nwid: string;
  objtype: string;
  name: string;
  creationTime: number;
  private: boolean;
  enableBroadcast: boolean;
  v4AssignMode: V4AssignMode;
  v6AssignMode: V6AssignMode;
  mtu: number;
  multicastLimit: number;
  revision: number;
  routes: Route[];
  ipAssignmentPools: IPAssignmentPool[];
  rules: Capability[];
  capabilities: Capability[];
  tags: Capability[];
  remoteTraceTarget: string;
  remoteTraceLevel: number;
}

export interface Capability {
  capability: string;
}

export interface IPAssignmentPool {
  ipRangeStart: string;
  ipRangeEnd: string;
}

export interface Route {
  target: string;
  via: string;
}

export interface V4AssignMode {
  zt: boolean;
}

export interface V6AssignMode {
  "6plane": boolean;
  rfc4193: boolean;
  zt: boolean;
}

// delete network
// https://docs.zerotier.com/service/v1/#operation/deleteNetwork
export interface HttpResponse {
  status: number;
  data: string;
}

// Get Network Member Details by ID
// https://docs.zerotier.com/service/v1/#operation/getControllerNetworkMember

export interface MemberRevisionCounters {
  [memberId: string]: number;
}

// Get network details
// https://docs.zerotier.com/service/v1/#operation/getNetwork

export interface ZTControllerResponse {
  network: ZtControllerNetwork;
  members: MembersEntity[];
}

// Get Network Member Details by ID
// https://docs.zerotier.com/service/v1/#operation/getControllerNetworkMember

export interface ZTControllerMemberDetails {
  id: string;
  address: string;
  nwid: string;
  authorized: boolean;
  activeBridge: boolean;
  identity: string;
  ipAssignments: string[];
  revision: number;
  vMajor: number;
  vMinor: number;
  vRev: number;
  vProto: number;
}

// Delete Network Member by ID
// https://docs.zerotier.com/service/v1/#operation/deleteControllerNetworkMember
export type MemberDeleteResponse = 200 | 401 | 403 | 404;

export interface MemberDeleteInput {
  nwid: string;
  memberId: string;
  central: boolean;
}

// Update Network Member by ID
// https://docs.zerotier.com/service/v1/#operation/updateControllerNetworkMember
export interface ZTControllerMemberUpdate {
  activeBridge: boolean;
  authorized: boolean;
  capabilities: number[];
  creationTime: number;
  id: string;
  identity: string;
  ipAssignments: string[];
  lastAuthorizedTime: number;
  lastDeauthorizedTime: number;
  noAutoAssignIps: boolean;
  revision: number;
  tags: Array<number[]>;
  vMajor: number;
  vMinor: number;
  vRev: number;
  vProto: number;
}

// Get all peers
// https://docs.zerotier.com/service/v1/#operation/getPeers
export interface ZTControllerGetPeer {
  address: string;
  isBonded: boolean;
  latency: number;
  paths: Path[];
  preferredPath: Path;
  role: string;
  version: string;
  versionMajor: number;
  versionMinor: number;
  versionRev: number;
}

export interface Path {
  active: boolean;
  address: string;
  expired: boolean;
  lastReceive: number;
  lastSend: number;
  preferred: boolean;
  trustedPathId: number;
}
