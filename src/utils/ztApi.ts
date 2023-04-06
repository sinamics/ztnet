/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import fs from "fs";
import axios, { type AxiosError, type AxiosResponse } from "axios";
import {
  type MembersEntity,
  type ZtControllerNetwork,
  type NetworkAndMembers,
} from "~/types/network";
const ZT_ADDR = process.env.ZT_ADDR || "http://127.0.0.1:9993";
let ZT_SECRET = process.env.ZT_SECRET;

const ZT_FILE =
  process.env.ZT_SECRET_FILE || "/var/lib/zerotier-one/authtoken.secret";

if (!ZT_SECRET) {
  try {
    ZT_SECRET = fs.readFileSync(ZT_FILE, "utf8");
  } catch (error) {
    throw error;
  }
}

const options = {
  json: true,
  headers: {
    "X-ZT1-Auth": ZT_SECRET,
    "Content-Type": "application/json",
  },
};
/* 
  Controller API for Admin
*/

// Check for controller function and return controller status.
// https://docs.zerotier.com/service/v1/#operation/getControllerStatus
export interface ZTControllerStatus {
  controller: boolean;
  apiVersion: number;
  clock: number;
}

//Get Version
export const get_controller_version = async function () {
  try {
    const { data } = await axios.get(ZT_ADDR + "/controller", options);

    return data as ZTControllerStatus;
  } catch (err) {
    throw err;
  }
};

// List IDs of all networks hosted by this controller.
// https://docs.zerotier.com/service/v1/#operation/getControllerNetworks

type ZTControllerListNetworks = Array<string>;

// Get all networks
export const get_controller_networks =
  async function (): Promise<ZTControllerListNetworks> {
    try {
      const { data } = await axios.get(
        ZT_ADDR + "/controller/network",
        options
      );

      return data;
    } catch (err) {
      throw err;
    }
  };

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
  allowTcpFallbackRelay: boolean;
  portMappingEnabled: boolean;
  primaryPort: number;
}

export const get_zt_address = async function () {
  try {
    const { data } = await axios.get(ZT_ADDR + "/status", options);
    return data as ZTControllerNodeStatus;
  } catch (err) {
    throw err;
  }
};

// Create new network
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

export const network_create = async (
  name,
  ipAssignment
): Promise<ZTControllerCreateNetwork> => {
  const zt_address = await get_zt_address();

  const config = {
    name,
    ...ipAssignment,
  };

  try {
    const response: AxiosResponse = await axios.post(
      `${ZT_ADDR}/controller/network/${zt_address.address}______`,
      config,
      options
    );
    return response.data as ZTControllerCreateNetwork;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      // eslint-disable-next-line no-console
      console.error(`Axios error: ${axiosError.message}`);
      // eslint-disable-next-line no-console
      console.error(`Status code: ${axiosError.response?.status}`);
      // eslint-disable-next-line no-console
      console.error(`Status text: ${axiosError.response?.statusText}`);
      throw axiosError;
    }
    // eslint-disable-next-line no-console
    console.error(`Unknown error: ${error.message}`);
    throw error;
  }
};
// delete network
// https://docs.zerotier.com/service/v1/#operation/deleteNetwork
type HttpResponse200<T> = {
  status: 200;
  data: T;
};

type HttpResponse401 = {
  status: 401;
  error: string;
};
type HttpResponse<T> = HttpResponse200<T> | HttpResponse401;

export async function network_delete(
  nwid: string
): Promise<HttpResponse<void>> {
  try {
    await axios.delete(`${ZT_ADDR}/controller/network/${nwid}`);
    return { status: 200, data: undefined };
  } catch (error) {
    if (error.response && error.response.status === 401) {
      return { status: 401, error: "Unauthorized" };
    }
    throw error;
  }
}

// Get network details
// https://docs.zerotier.com/service/v1/#operation/getNetwork

// Get Network Member Details by ID
// https://docs.zerotier.com/service/v1/#operation/getControllerNetworkMember

type ZTControllerResponse = {
  network: ZtControllerNetwork;
  members: MembersEntity[];
};

export const network_detail = async function (
  nwid: string
): Promise<NetworkAndMembers> {
  try {
    const members: AxiosResponse = await axios.get(
      `${ZT_ADDR}/controller/network/${nwid}/member/`,
      options
    );
    const network: AxiosResponse = await axios.get(
      `${ZT_ADDR}/controller/network/${nwid}`,
      options
    );
    const membersArr: any = [];
    for (const member in members.data) {
      const memberDetails: AxiosResponse = await axios.get(
        `${ZT_ADDR}/controller/network/${nwid}/member/${member}`,
        options
      );
      membersArr.push(memberDetails.data);
    }
    return {
      network: { ...network.data },
      members: [...membersArr],
    };
  } catch (err) {
    return { network: null, members: [] };
  }
};

export const network_update = async function (
  nwid: any,
  data: any
): Promise<Partial<ZTControllerResponse>> {
  try {
    const updated = await axios.post(
      `${ZT_ADDR}/controller/network/${nwid}`,
      data,
      options
    );
    return { network: { ...updated.data } };
  } catch (err) {
    throw err;
  }
};

// Get Network Member Details by ID
// https://docs.zerotier.com/service/v1/#operation/getControllerNetworkMember
export const member_detail = async function (nwid: string, id: string) {
  try {
    const response = await axios.get(
      `${ZT_ADDR}/controller/network/${nwid}/member/${id}`,
      options
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      // eslint-disable-next-line no-console
      console.error(axiosError.response?.statusText || "Unknown error");
      throw axiosError;
    }
    throw error;
  }
};

// Delete Network Member by ID
// https://docs.zerotier.com/service/v1/#operation/deleteControllerNetworkMember
type MemberDeleteResponse = 200 | 401 | 403 | 404;

type MemberDeleteInput = {
  nwid: string;
  memberId: string;
};

export const member_delete = async ({
  nwid,
  memberId,
}: MemberDeleteInput): Promise<MemberDeleteResponse> => {
  try {
    const response: AxiosResponse = await axios.delete(
      `${ZT_ADDR}/controller/network/${nwid}/member/${memberId}`,
      options
    );
    return response.status as MemberDeleteResponse;
  } catch (error) {
    if (error.response) {
      // Return the status code from the error response
      return error.response.status as MemberDeleteResponse;
    }
    // eslint-disable-next-line no-console
    console.error("Error deleting member:", error.message);
    throw error;
  }
};

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

export const member_update = async (
  nwid: string,
  memberId: string,
  data
): Promise<ZTControllerMemberUpdate> => {
  try {
    const response: AxiosResponse = await axios.post(
      `${ZT_ADDR}/controller/network/${nwid}/member/${memberId}`,
      data,
      options
    );
    return response.data as ZTControllerMemberUpdate;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error updating member:", error.message);
    throw error;
  }
};

// Get all peers
// https://docs.zerotier.com/service/v1/#operation/getPeers
export interface ZTControllerGetPeer {
  address: string;
  isBonded: boolean;
  latency: number;
  paths: Path[];
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

export const peers = async (): Promise<ZTControllerGetPeer> => {
  try {
    const response: AxiosResponse = await axios.get(`${ZT_ADDR}/peer`, options);
    return response.data as ZTControllerGetPeer;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching peers:", error.message);
    throw error;
  }
};

// Get information about a specific peer by Node ID.
// https://docs.zerotier.com/service/v1/#operation/getPeer

export const peer = async (
  userZtAddress: string
): Promise<ZTControllerGetPeer[]> => {
  try {
    const response: AxiosResponse = await axios.get(
      `${ZT_ADDR}/peer/${userZtAddress}`,
      options
    );

    return response.data as ZTControllerGetPeer[];
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching peer:", error.message);
    throw error;
  }
};
