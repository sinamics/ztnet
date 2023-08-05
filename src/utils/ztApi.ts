import fs from "fs";
import { prisma } from "~/server/db";
import { IPv4gen } from "./IPv4gen";
import axios, {
  type AxiosRequestConfig,
  type AxiosError,
  type AxiosResponse,
} from "axios";
import { APIError } from "~/server/helpers/errorHandler";
import {
  type HttpResponse,
  type ZTControllerCreateNetwork,
  type ZTControllerNodeStatus,
  type ZTControllerStatus,
  // type ZTControllerMemberDetails,
  type MemberDeleteInput,
  type MemberDeleteResponse,
  type ZTControllerGetPeer,
} from "~/types/ztController";

import { type CentralControllerStatus } from "~/types/central/controllerStatus";
import {
  type FlattenCentralMembers,
  type CentralMembers,
} from "~/types/central/members";
import {
  type CentralNetwork,
  type FlattenCentralNetwork,
} from "~/types/central/network";
import { type MemberEntity } from "~/types/local/member";
import { type NetworkEntity } from "~/types/local/network";
import { type NetworkAndMemberResponse } from "~/types/network";

const LOCAL_ZT_ADDR = process.env.ZT_ADDR || "http://127.0.0.1:9993";
const CENTRAL_ZT_ADDR = "https://api.zerotier.com/api/v1";

let ZT_SECRET = process.env.ZT_SECRET;

const ZT_FILE =
  process.env.ZT_SECRET_FILE || "/var/lib/zerotier-one/authtoken.secret";

if (!ZT_SECRET) {
  if (process.env.IS_GITHUB_ACTION !== "true") {
    try {
      ZT_SECRET = fs.readFileSync(ZT_FILE, "utf8");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("an error occurred while reading the ZT_SECRET");
    }
  } else {
    // GitHub Actions
    ZT_SECRET = "dummy_text_to_skip_gh";
  }
}

const getTokenFromDb = async () => {
  const globalOptions = await prisma.globalOptions.findFirst({
    where: {
      id: 1,
    },
  });
  return globalOptions?.ztCentralApiKey;
};

const getOptions = async (isCentral = false) => {
  if (isCentral) {
    const token = await getTokenFromDb();
    return {
      json: true,
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
      },
    };
  }

  return {
    json: true,
    headers: {
      "X-ZT1-Auth": ZT_SECRET,
      "Content-Type": "application/json",
    },
  };
};

export const flattenCentralMember = (
  member: CentralMembers
): FlattenCentralMembers => {
  const { id: nodeId, config, ...otherProps } = member;
  const flattenedMember = { nodeId, ...config, ...otherProps };
  return flattenedMember;
};

export const flattenCentralMembers = (
  members: CentralMembers[]
): FlattenCentralMembers[] => {
  if (!members) return [];
  return members.map((member) => flattenCentralMember(member));
};

export const flattenNetwork = (
  network: CentralNetwork
): FlattenCentralNetwork => {
  const { id: nwid, config, ...otherProps } = network;
  const flattenedNetwork = { nwid, ...config, ...otherProps };
  return flattenedNetwork;
};

export const flattenNetworks = (
  networks: CentralNetwork[]
): FlattenCentralNetwork[] => {
  return networks.map((network) => flattenNetwork(network));
};

/*
 *    Axios Helper functions
 *
 */
const getData = async <T>(
  addr: string,
  headers: AxiosRequestConfig
): Promise<T> => {
  try {
    const { data } = await axios.get<T>(addr, headers);
    return data;
  } catch (error) {
    const message = `An error occurred fetching data from ${addr}`;
    throw new APIError(message, error as AxiosError);
  }
};
const postData = async <T, P = unknown>(
  addr: string,
  headers: AxiosRequestConfig,
  payload: P
): Promise<T> => {
  try {
    const { data } = await axios.post<T>(addr, payload, headers);

    return data;
  } catch (error) {
    const message = `An error occurred while posting data to ${addr}`;
    throw new APIError(message, error as AxiosError);
  }
};

// const deleteData = async <T>(
//   addr: string,
//   headers: AxiosRequestConfig
// ): Promise<T> => {
//   try {
//     const { data } = await axios.delete<T>(addr, headers);
//     return data;
//   } catch (error) {
//     const prefix = isCentral ? "[CENTRAL] " : "";
// const message = `${prefix}An error occurred while deleting data`;
//     throw new APIError(message, error as AxiosError);
//   }
// };

/* 
  Controller API for Admin
*/

// Check for controller function and return controller status.
// https://docs.zerotier.com/service/v1/#operation/getControllerStatus

//Get Version
export const get_controller_version = async function () {
  const addr = `${LOCAL_ZT_ADDR}/controller`;

  // get headers based on local or central api
  const headers = await getOptions(false);
  try {
    return await getData<ZTControllerStatus>(addr, headers);
  } catch (error) {
    const message = `An error occurred while getting get_controller_version`;
    throw new APIError(message, error as AxiosError);
  }
};

// List IDs of all networks hosted by this controller.
// https://docs.zerotier.com/service/v1/#operation/getControllerNetworks

type ZTControllerListNetworks = Array<string>;

// Get all networks
export const get_controller_networks = async function (
  isCentral = false
): Promise<ZTControllerListNetworks | FlattenCentralNetwork[]> {
  const addr = isCentral
    ? `${CENTRAL_ZT_ADDR}/network`
    : `${LOCAL_ZT_ADDR}/controller/network`;

  // get headers based on local or central api
  const headers = await getOptions(isCentral);
  try {
    if (isCentral) {
      const data = await getData<CentralNetwork[]>(addr, headers);
      return flattenNetworks(data);
    } else {
      return await getData<ZTControllerListNetworks>(addr, headers);
    }
  } catch (error) {
    const prefix = isCentral ? "[CENTRAL] " : "";
    const message = `${prefix}An error occurred while getting get_controller_networks`;
    throw new APIError(message, axios.isAxiosError(error) ? error : undefined);
  }
};

/* 
  Node status and addressing info
  https://docs.zerotier.com/service/v1/#operation/getStatus
*/

export const get_controller_status = async function (isCentral: boolean) {
  const addr = isCentral
    ? `${CENTRAL_ZT_ADDR}/status`
    : `${LOCAL_ZT_ADDR}/status`;

  // get headers based on local or central api
  const headers = await getOptions(isCentral);
  try {
    if (isCentral) {
      return await getData<CentralControllerStatus>(addr, headers);
    } else {
      return await getData<ZTControllerNodeStatus>(addr, headers);
    }
  } catch (error) {
    const prefix = isCentral ? "[CENTRAL] " : "";
    const message = `${prefix}An error occurred while getting get_controller_status`;
    throw new APIError(message, error as AxiosError);
  }
};

/* 
  Create new zerotier network
  https://docs.zerotier.com/service/v1/#operation/createNetwork
*/
export const network_create = async (
  name: string,
  ipAssignment,
  isCentral = false
): Promise<ZTControllerCreateNetwork | FlattenCentralNetwork> => {
  // get headers based on local or central api
  const headers = await getOptions(isCentral);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const payload: Partial<CentralNetwork> = {
    name,
    private: true,
    ...ipAssignment,
  };

  try {
    if (isCentral) {
      const data = await postData<CentralNetwork>(
        `${CENTRAL_ZT_ADDR}/network`,
        headers,
        { config: { ...payload }, description: "created with ztnet" }
      );

      return flattenNetwork(data);
    } else {
      const controllerStatus = (await get_controller_status(
        isCentral
      )) as ZTControllerNodeStatus;
      return await postData<ZTControllerCreateNetwork>(
        `${LOCAL_ZT_ADDR}/controller/network/${controllerStatus.address}______`,
        headers,
        payload
      );
    }
  } catch (error) {
    const prefix = isCentral ? "[CENTRAL] " : "";
    const message = `${prefix}An error occurred while getting network_create`;
    throw new APIError(message, error as AxiosError);
  }
};

// delete network
// https://docs.zerotier.com/service/v1/#operation/deleteNetwork

export async function network_delete(
  nwid: string,
  isCentral = false
): Promise<HttpResponse> {
  const addr = isCentral
    ? `${CENTRAL_ZT_ADDR}/network/${nwid}`
    : `${LOCAL_ZT_ADDR}/controller/network/${nwid}`;

  // get headers based on local or central api
  const headers = await getOptions(isCentral);
  try {
    const response = await axios.delete(addr, headers);

    return { status: response.status, data: undefined };
  } catch (error) {
    const prefix = isCentral ? "[CENTRAL] " : "";
    const message = `${prefix}An error occurred while getting network_delete`;
    throw new APIError(message, error as AxiosError);
  }
}

// Get Network Member Details by ID
// https://docs.zerotier.com/service/v1/#operation/getControllerNetworkMember

export const network_members = async function (
  nwid: string,
  isCentral = false
) {
  try {
    const addr = isCentral
      ? `${CENTRAL_ZT_ADDR}/network/${nwid}/member`
      : `${LOCAL_ZT_ADDR}/controller/network/${nwid}/member`;

    // get headers based on local or central api
    const headers = await getOptions(isCentral);

    // fetch members
    return await getData<MemberEntity[]>(addr, headers);
  } catch (error: unknown) {
    const prefix = isCentral ? "[CENTRAL] " : "";
    const message = `${prefix}An error occurred while getting network_members`;
    throw new APIError(message, error as AxiosError);
  }
};

export const local_network_detail = async function (
  nwid: string,
  isCentral = false
): Promise<NetworkAndMemberResponse> {
  try {
    // get all members for a specific network
    const members = await network_members(nwid);

    // get headers based on local or central api
    const headers = await getOptions(isCentral);

    const network = await getData<NetworkEntity>(
      `${LOCAL_ZT_ADDR}/controller/network/${nwid}`,
      headers
    );

    const membersArr: MemberEntity[] = [];
    for (const [memberId] of Object.entries(members)) {
      const memberDetails = await getData<MemberEntity>(
        `${LOCAL_ZT_ADDR}/controller/network/${nwid}/member/${memberId}`,
        headers
      );

      membersArr.push(memberDetails);
    }

    return {
      network: { ...network },
      members: [...membersArr],
    };
  } catch (error) {
    const message =
      "An error occurred while getting data from network_details function";
    throw new APIError(message, error as AxiosError);
  }
};
// Get network details
// https://docs.zerotier.com/service/v1/#operation/getNetwork

export const central_network_detail = async function (
  nwid: string,
  isCentral = false
): Promise<NetworkAndMemberResponse> {
  try {
    const addr = isCentral
      ? `${CENTRAL_ZT_ADDR}/network/${nwid}`
      : `${LOCAL_ZT_ADDR}/controller/network/${nwid}`;

    // get headers based on local or central api
    const headers = await getOptions(isCentral);

    // get all members for a specific network
    const members = await network_members(nwid, isCentral);
    const network = await getData<CentralNetwork>(addr, headers);

    const membersArr = await Promise.all(
      members?.map(async (member) => {
        return await getData<CentralMembers>(
          `${addr}/member/${member?.nodeId}`,
          headers
        );
      })
    );

    // Get available cidr options.
    const ipAssignmentPools = IPv4gen(null);
    const { cidrOptions } = ipAssignmentPools;

    const { id: networkId, config: networkConfig, ...restData } = network;

    return {
      network: {
        cidr: cidrOptions,
        nwid: networkId,
        ...restData,
        ...networkConfig,
      },
      members: [...flattenCentralMembers(membersArr)],
    };
  } catch (error) {
    const source = isCentral ? "[ZT CENTRAL]" : "";
    const message = `${source} An error occurred while getting data from network_details function`;
    throw new APIError(message, error as AxiosError);
  }
};

type networkUpdate = {
  nwid: string;
  updateParams: Partial<NetworkEntity | CentralNetwork>;
  central?: boolean;
};

// Get network details
// https://docs.zerotier.com/service/v1/#operation/getNetwork
export const network_update = async function ({
  nwid,
  updateParams: payload,
  central = false,
}: networkUpdate): Promise<Partial<NetworkEntity | CentralNetwork>> {
  const addr = central
    ? `${CENTRAL_ZT_ADDR}/network/${nwid}`
    : `${LOCAL_ZT_ADDR}/controller/network/${nwid}`;

  // get headers based on local or central api
  const headers = await getOptions(central);

  try {
    return await postData<NetworkEntity | CentralNetwork>(
      addr,
      headers,
      payload
    );
  } catch (error) {
    const prefix = central ? "[CENTRAL] " : "";
    const message = `${prefix}An error occurred while getting network_update`;
    throw new APIError(message, error as AxiosError);
  }
};

// Delete Network Member by ID
// https://docs.zerotier.com/service/v1/#operation/deleteControllerNetworkMember

export const member_delete = async ({
  nwid,
  memberId,
  central = false,
}: MemberDeleteInput): Promise<Partial<MemberDeleteResponse>> => {
  const addr = central
    ? `${CENTRAL_ZT_ADDR}/network/${nwid}/member/${memberId}`
    : `${LOCAL_ZT_ADDR}/controller/network/${nwid}/member/${memberId}`;

  // get headers based on local or central api
  const headers = await getOptions(central);
  try {
    const response: AxiosResponse = await axios.delete(addr, headers);
    return response.status as MemberDeleteResponse;
  } catch (error) {
    const prefix = central ? "[CENTRAL] " : "";
    const message = `${prefix}An error occurred while getting member_delete`;
    throw new APIError(message, error as AxiosError);
  }
};

type memberUpdate = {
  nwid: string;
  memberId: string;
  updateParams: Partial<MemberEntity | FlattenCentralMembers>;
  central?: boolean;
};

// Update Network Member by ID
// https://docs.zerotier.com/service/v1/#operation/updateControllerNetworkMember
export const member_update = async ({
  nwid,
  memberId,
  updateParams: payload,
  central = false,
}: memberUpdate): Promise<MemberEntity | FlattenCentralMembers> => {
  const addr = central
    ? `${CENTRAL_ZT_ADDR}/network/${nwid}/member/${memberId}`
    : `${LOCAL_ZT_ADDR}/controller/network/${nwid}/member/${memberId}`;

  // get headers based on local or central api
  const headers = await getOptions(central);
  try {
    return await postData<MemberEntity | FlattenCentralMembers>(
      addr,
      headers,
      payload
    );
  } catch (error) {
    const prefix = central ? "[CENTRAL] " : "";
    const message = `${prefix}An error occurred while getting member_update`;
    throw new APIError(message, error as AxiosError);
  }
};

// Get Network Member Details by ID
// https://docs.zerotier.com/service/v1/#operation/getControllerNetworkMember

export const member_details = async function (
  nwid: string,
  memberId: string,
  central = false
): Promise<MemberEntity | FlattenCentralMembers> {
  // get headers based on local or central api
  const headers = await getOptions(central);

  try {
    const addr = central
      ? `${CENTRAL_ZT_ADDR}/network/${nwid}/member/${memberId}`
      : `${LOCAL_ZT_ADDR}/controller/network/${nwid}/member/${memberId}`;

    return await getData<MemberEntity | FlattenCentralMembers>(addr, headers);
  } catch (error) {
    const message = "An error occurred while getting member_detail";
    throw new APIError(message, error as AxiosError);
  }
};

// Get all peers
// https://docs.zerotier.com/service/v1/#operation/getPeers
export const peers = async (): Promise<ZTControllerGetPeer> => {
  const addr = `${LOCAL_ZT_ADDR}/peer`;

  // get headers based on local or central api
  const headers = await getOptions(false);

  try {
    const response: AxiosResponse = await axios.get(addr, headers);
    return response.data as ZTControllerGetPeer;
  } catch (error) {
    const message = `An error occurred while getting peers`;
    throw new APIError(message, error as AxiosError);
  }
};

// Get information about a specific peer by Node ID.
// https://docs.zerotier.com/service/v1/#operation/getPeer
export const peer = async (
  userZtAddress: string
): Promise<ZTControllerGetPeer[]> => {
  const addr = `${LOCAL_ZT_ADDR}/peer/${userZtAddress}`;

  // get headers based on local or central api
  const headers = await getOptions(false);

  try {
    const response: AxiosResponse = await axios.get(addr, headers);

    if (!response.data) return null as ZTControllerGetPeer[];
    return response.data as ZTControllerGetPeer[];
  } catch (error) {
    return null;
  }
};
