interface NetworkBase {
  type: string;
  clock: number;
  description: string;
  rulesSource: string;
  ownerId: string;
  onlineMemberCount: number;
  authorizedMemberCount: number;
  totalMemberCount: number;
  capabilitiesByName: CapabilitiesByName;
}

interface NetworkConfig {
  authTokens: null;
  creationTime: number;
  capabilities: Capability[];
  enableBroadcast: boolean;
  id: string;
  ipAssignmentPools: IpAssignmentPool[];
  lastModified: number;
  mtu: number;
  multicastLimit: number;
  name: string;
  private: boolean;
  remoteTraceLevel: number;
  remoteTraceTarget: string;
  routes: Route[];
  rules: Rule[];
  tags: Tag[];
  v4AssignMode: { zt: boolean };
  v6AssignMode: { "6plane": boolean; rfc4193: boolean; zt: boolean };
  dns: { domain: string; servers: string[] };
  ssoConfig: { enabled: boolean; mode: string };
}

interface Capability {
  default: boolean;
  id: number;
  rules: Rule[];
}

interface Rule {
  type: string;
  etherType?: number;
  not?: boolean;
  or?: boolean;
  id?: number;
  value?: number;
}

interface Tag {
  default: number | null;
  id: number;
}

interface IpAssignmentPool {
  ipRangeStart: string;
  ipRangeEnd: string;
}

interface Route {
  target: string;
}
interface TagsByName {
  [tagName: string]: TagDetails;
}
interface CapabilitiesByName {
  [key: string]: number;
}

interface TagDetails {
  default: number | null;
  enums: Record<string, number>;
  flags: Record<string, string>;
  id: number;
}

export interface CentralNetwork extends NetworkBase {
  id: string;
  config: Partial<NetworkConfig>;
}

export interface FlattenCentralNetwork extends NetworkBase, NetworkConfig {
  cidr?: string[];
  nwid: string;
}
