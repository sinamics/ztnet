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
  capabilities?: null[] | null;
  clientId?: string;
  creationTime?: number;
  dns?: dns;
  enableBroadcast?: boolean;
  id: string;
  ipAssignmentPools?: IpAssignmentPoolsEntity[];
  mtu?: number;
  multicastLimit?: number;
  routes?: RoutesEntity[];
  rules?: RulesEntity[];
  rulesSource?: string;
  ssoEnabled?: boolean;
  cidr?: string[];
  tagsByName?: TagsByName;
  capabilitiesByName?: CapabilitiesByName;
}

interface CapabilitiesByName {
  [key: string]: number;
}
interface TagsByName {
  [tagName: string]: TagDetails;
  id?: number;
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
