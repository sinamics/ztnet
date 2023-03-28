// Network
export interface NetworkAndMembers {
  network: Network;
  members: Member[];
}

export interface Member {
  activeBridge: boolean;
  address: string;
  authenticationExpiryTime: number;
  authorized: boolean;
  capabilities: any[];
  creationTime: number;
  id: string;
  identity: string;
  ipAssignments: string[];
  lastAuthorizedCredential: null;
  lastAuthorizedCredentialType: string;
  lastAuthorizedTime: number;
  lastDeauthorizedTime: number;
  noAutoAssignIps: boolean;
  nwid: string;
  objtype: string;
  remoteTraceLevel: number;
  remoteTraceTarget: null;
  revision: number;
  ssoExempt: boolean;
  tags: any[];
  vMajor: number;
  vMinor: number;
  vProto: number;
  vRev: number;
}

export interface Network {
  authTokens: null[];
  authorizationEndpoint: string;
  capabilities: any[];
  clientId: string;
  creationTime: number;
  dns: any[];
  enableBroadcast: boolean;
  id: string;
  ipAssignmentPools: IPAssignmentPool[];
  mtu: number;
  multicastLimit: number;
  name: string;
  nwid: string;
  objtype: string;
  private: boolean;
  remoteTraceLevel: number;
  remoteTraceTarget: null;
  revision: number;
  routes: Route[];
  rules: Rule[];
  rulesSource: string;
  ssoEnabled: boolean;
  tags: any[];
  v4AssignMode: V4AssignMode;
  v6AssignMode: V6AssignMode;
}

export interface IPAssignmentPool {
  ipRangeEnd: string;
  ipRangeStart: string;
}

export interface Route {
  target: string;
  via: string | null;
}

export interface Rule {
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
