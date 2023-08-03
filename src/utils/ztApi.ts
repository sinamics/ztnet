/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import fs from "fs";
import axios, { type AxiosError, type AxiosResponse } from "axios";
import { type NetworkAndMembers } from "~/types/network";
import { APIError } from "~/server/helpers/errorHandler";
import {
  type ZTControllerResponse,
  type HttpResponse,
  type MemberRevisionCounters,
  type ZTControllerCreateNetwork,
  type ZTControllerNodeStatus,
  type ZTControllerStatus,
  type ZTControllerMemberDetails,
  type MemberDeleteInput,
  type MemberDeleteResponse,
  type ZTControllerMemberUpdate,
  type ZTControllerGetPeer,
} from "~/types/ztController";
import { prisma } from "~/server/db";
import { IPv4gen } from "./IPv4gen";

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
    const { data } = await axios.get(addr, headers);

    return data as ZTControllerStatus;
  } catch (error) {
    const message = "An error occurred while getting get_controller_version";
    throw new APIError(message, error as AxiosError);
  }
};

// List IDs of all networks hosted by this controller.
// https://docs.zerotier.com/service/v1/#operation/getControllerNetworks

type ZTControllerListNetworks = Array<string>;

// Get all networks
export const get_controller_networks = async function (
  isCentral = false
): Promise<ZTControllerListNetworks> {
  const addr = isCentral
    ? `${CENTRAL_ZT_ADDR}/network`
    : `${LOCAL_ZT_ADDR}/controller/network`;

  // get headers based on local or central api
  const headers = await getOptions(isCentral);
  try {
    const { data } = await axios.get(addr, headers);
    return data as ZTControllerListNetworks;
  } catch (error) {
    const message = "An error occurred while getting get_controller_networks";
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
    : `${LOCAL_ZT_ADDR}/controller/status`;

  // get headers based on local or central api
  const headers = await getOptions(isCentral);
  try {
    const { data } = await axios.get(addr, headers);
    return data as ZTControllerNodeStatus;
  } catch (error) {
    const message = "An error occurred while getting get_controller_status";
    throw new APIError(message, error as AxiosError);
  }
};

/* 
  Create new zerotier network
  https://docs.zerotier.com/service/v1/#operation/createNetwork
*/
export const network_create = async (
  name,
  ipAssignment,
  isCentral = false
): Promise<ZTControllerCreateNetwork> => {
  const controllerStatus = await get_controller_status(isCentral);
  const addr = isCentral
    ? `${CENTRAL_ZT_ADDR}/network/${controllerStatus.address}______`
    : `${LOCAL_ZT_ADDR}/controller/network/${controllerStatus.address}______`;

  // get headers based on local or central api
  const headers = await getOptions(isCentral);

  const config = {
    name,
    ...ipAssignment,
  };

  try {
    const response: AxiosResponse = await axios.post(addr, config, headers);

    return response.data as ZTControllerCreateNetwork;
  } catch (error) {
    const message = "An error occurred while getting network_create";
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
    const message = "An error occurred while getting network_delete";
    throw new APIError(message, error as AxiosError);
  }
}

// Get Network Member Details by ID
// https://docs.zerotier.com/service/v1/#operation/getControllerNetworkMember

export const network_members = async function (
  nwid: string,
  isCentral = false
): Promise<MemberRevisionCounters> {
  try {
    const addr = isCentral
      ? `${CENTRAL_ZT_ADDR}/network/${nwid}/member`
      : `${LOCAL_ZT_ADDR}/controller/network/${nwid}/member`;

    // get headers based on local or central api
    const headers = await getOptions(isCentral);
    // fetch members
    const members: AxiosResponse = await axios.get(addr, headers);

    return members.data as MemberRevisionCounters;
  } catch (error) {
    const message = `An error occurred while getting network_members ${error}`;
    throw new APIError(message, error as AxiosError);
  }
};

export const local_network_detail = async function (
  nwid: string,
  isCentral = false
): Promise<NetworkAndMembers> {
  try {
    // get all members for a specific network
    const members = await network_members(nwid);

    // get headers based on local or central api
    const headers = await getOptions(isCentral);

    const network: AxiosResponse = await axios.get(
      `${LOCAL_ZT_ADDR}/controller/network/${nwid}`,
      headers
    );

    const membersArr: any = [];
    for (const member in members) {
      const memberDetails: AxiosResponse = await axios.get(
        `${LOCAL_ZT_ADDR}/controller/network/${nwid}/member/${member}`,
        headers
      );
      membersArr.push(memberDetails.data);
    }
    return {
      network: { ...network.data },
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
): Promise<NetworkAndMembers> {
  try {
    const addr = isCentral
      ? `${CENTRAL_ZT_ADDR}/network/${nwid}`
      : `${LOCAL_ZT_ADDR}/controller/network/${nwid}`;

    // get headers based on local or central api
    const headers = await getOptions(isCentral);

    // get all members for a specific network
    const members = await network_members(nwid, isCentral);

    const network: AxiosResponse = await axios.get(addr, headers);

    const membersArr = await Promise.all(
      members?.map(async (member) => {
        const memberDetails: AxiosResponse = await axios.get(
          `${addr}/member/${member.nodeId}`,
          headers
        );
        return {
          ...memberDetails.data,
        };
      })
    );

    // Get available cidr options.
    const ipAssignmentPools = IPv4gen(null);
    const { cidrOptions } = ipAssignmentPools;

    const { id: networkId, config: networkConfig, ...restData } = network.data;

    return {
      network: {
        cidr: cidrOptions,
        nwid: networkId,
        ...restData,
        ...networkConfig,
      },
      members: [...membersArr],
    };
  } catch (error) {
    const source = isCentral ? "[ZT CENTRAL]" : "";
    const message = `${source} An error occurred while getting data from network_details function ${error}`;
    throw new APIError(message, error as AxiosError);
  }
};

// Get network details
// https://docs.zerotier.com/service/v1/#operation/getNetwork
export const network_update = async function ({
  nwid,
  updateParams: data,
  central = false,
}): Promise<Partial<ZTControllerResponse>> {
  const addr = central
    ? `${CENTRAL_ZT_ADDR}/network/${nwid}`
    : `${LOCAL_ZT_ADDR}/controller/network/${nwid}`;

  // get headers based on local or central api
  const headers = await getOptions(central);
  try {
    const updated = await axios.post(addr, data, headers);
    return { network: { ...updated.data } };
  } catch (error) {
    const message = "An error occurred while getting network_update";
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
    const message = "An error occurred while getting member_delete";
    throw new APIError(message, error as AxiosError);
  }
};

// Update Network Member by ID
// https://docs.zerotier.com/service/v1/#operation/updateControllerNetworkMember
export const member_update = async (
  nwid: string,
  memberId: string,
  data,
  central = false
): Promise<ZTControllerMemberUpdate> => {
  const addr = central
    ? `${CENTRAL_ZT_ADDR}/network/${nwid}/member/${memberId}`
    : `${LOCAL_ZT_ADDR}/controller/network/${nwid}/member/${memberId}`;

  // get headers based on local or central api
  const headers = await getOptions(central);
  try {
    const response: AxiosResponse = await axios.post(addr, data, headers);
    return response.data as ZTControllerMemberUpdate;
  } catch (error) {
    const message = "An error occurred while getting member_update";
    throw new APIError(message, error as AxiosError);
  }
};

// Get all peers
// https://docs.zerotier.com/service/v1/#operation/getPeers
export const peers = async (): Promise<ZTControllerGetPeer> => {
  try {
    const response: AxiosResponse = await axios.get(`${ZT_ADDR}/peer`, options);
    return response.data as ZTControllerGetPeer;
  } catch (error) {
    const message = "An error occurred while getting peers";
    throw new APIError(message, error as AxiosError);
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

    if (!response.data) return null as ZTControllerGetPeer[];
    return response.data as ZTControllerGetPeer[];
  } catch (error) {
    return null;
  }
};
