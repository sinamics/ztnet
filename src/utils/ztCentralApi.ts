/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import axios, { type AxiosError, type AxiosResponse } from "axios";
import { type NetworkAndMembers } from "~/types/network";
import { APIError } from "~/server/helpers/errorHandler";
import {
  type ZTControllerResponse,
  type HttpResponse,
  type MemberRevisionCounters,
  type ZTControllerCreateNetwork,
  type ZTControllerStatus,
  type ZTControllerMemberDetails,
  type MemberDeleteInput,
  type MemberDeleteResponse,
  type ZTControllerMemberUpdate,
  type ZTControllerGetPeer,
} from "~/types/ztController";
import { prisma } from "~/server/db";

const ZT_ADDR = "https://api.zerotier.com/api/v1";

const getTokenFromDb = async () => {
  const globalOptions = await prisma.globalOptions.findFirst({
    where: {
      id: 1,
    },
  });
  return globalOptions?.ztCentralApiKey;
};

const headers = {
  json: true,
  headers: {
    Authorization: `token ${await getTokenFromDb()}`,
    "Content-Type": "application/json",
  },
};

const flattenNetworks = (networks: string[]) => {
  if (!networks) return [];
  return networks.map((network) => {
    // Destructure the network object into config and other properties
    const { id: nwid, config, ...otherProps } = network;

    // Merge the config object into the main network object
    const flattenedNetwork = { nwid, ...config, ...otherProps };

    return flattenedNetwork;
  });
};

/* 
  Controller API for Admin
*/

// Check for controller function and return controller status.
// https://docs.zerotier.com/service/v1/#operation/getControllerStatus

//Get Version
export const get_controller_version = async function () {
  try {
    const { data } = await axios.get(ZT_ADDR + "", headers);

    return data as ZTControllerStatus;
  } catch (error) {
    const message =
      "[ZT CENTRAL] An error occurred while getting get_controller_version";
    throw new APIError(message, error as AxiosError);
  }
};

// List IDs of all networks hosted by this controller.
// https://docs.zerotier.com/service/v1/#operation/getControllerNetworks

type ZTControllerListNetworks = Array<string>;

// Get all networks
export const get_controller_networks =
  async function (): Promise<ZTControllerListNetworks> {
    try {
      const { data } = await axios.get(ZT_ADDR + "/network", headers);
      const flattenedNetworks = flattenNetworks(data);
      return flattenedNetworks as ZTControllerListNetworks;
    } catch (error) {
      const message =
        "[ZT CENTRAL] An error occurred while getting get_controller_networks";
      throw new APIError(
        message,
        axios.isAxiosError(error) ? error : undefined
      );
    }
  };

/* 
  Create new zerotier network
  https://docs.zerotier.com/service/v1/#operation/createNetwork
*/
export const network_create = async (): Promise<ZTControllerCreateNetwork> => {
  try {
    const response: AxiosResponse = await axios.post(
      ZT_ADDR + "/network",
      {},
      options
    );
    return response.data as ZTControllerCreateNetwork;
  } catch (error) {
    const message =
      "[ZT CENTRAL] An error occurred while getting network_create";
    throw new APIError(message, error as AxiosError);
  }
};
// delete network
// https://docs.zerotier.com/service/v1/#operation/deleteNetwork

export async function network_delete(nwid: string): Promise<HttpResponse> {
  try {
    const response = await axios.delete(`${ZT_ADDR}/network/${nwid}`, headers);

    return { status: response.status, data: undefined };
  } catch (error) {
    const message =
      "[ZT CENTRAL] An error occurred while getting network_delete";
    throw new APIError(message, error as AxiosError);
  }
}

// Get Network Member Details by ID
// https://docs.zerotier.com/service/v1/#operation/getControllerNetworkMember

export const network_members = async function (
  nwid: string
): Promise<MemberRevisionCounters> {
  try {
    const members: AxiosResponse = await axios.get(
      `${ZT_ADDR}/network/${nwid}/member`,
      headers
    );

    return members.data as MemberRevisionCounters;
  } catch (error) {
    const message =
      "[ZT CENTRAL] An error occurred while getting network_members";
    throw new APIError(message, error as AxiosError);
  }
};

// Get network details
// https://docs.zerotier.com/service/v1/#operation/getNetwork

export const network_detail = async function (
  nwid: string
): Promise<NetworkAndMembers> {
  try {
    // get all members for a specific network
    const members = await network_members(nwid);

    const network: AxiosResponse = await axios.get(
      `${ZT_ADDR}/network/${nwid}`,
      headers
    );

    const membersArr = await Promise.all(
      members?.map(async (member) => {
        const memberDetails: AxiosResponse = await axios.get(
          `${ZT_ADDR}/network/${nwid}/member/${member.nodeId}`,
          headers
        );

        const { id: memberId, config, ...restMember } = memberDetails.data;
        return {
          ...restMember,
          ...config,
          memberId,
        };
      })
    );
    // console.log(JSON.stringify(network.data,null,2))
    const { id: networkId, config: networkConfig, ...restData } = network.data;

    return {
      network: { nwid: networkId, ...restData, ...networkConfig },
      members: [...membersArr],
    };
  } catch (error) {
    const message = `[ZT CENTRAL] An error occurred while getting data from network_details function ${error}`;
    throw new APIError(message, error as AxiosError);
  }
};

// Get network details
// https://docs.zerotier.com/service/v1/#operation/getNetwork
export const network_update = async function (
  nwid: any,
  data: any
): Promise<Partial<ZTControllerResponse>> {
  try {
    const updated = await axios.post(
      `${ZT_ADDR}/network/${nwid}`,
      { config: { ...data } },
      headers
    );
    return { network: { ...updated.data } };
  } catch (error) {
    const message =
      "[ZT CENTRAL] An error occurred while getting network_update";
    throw new APIError(message, error as AxiosError);
  }
};

// Get Network Member Details by ID
// https://docs.zerotier.com/service/v1/#operation/getControllerNetworkMember

export const member_detail = async function (
  nwid: any,
  id: any
): Promise<ZTControllerMemberDetails> {
  try {
    const response = await axios.get(
      `${ZT_ADDR}/network/${nwid}/member/${id}`,
      headers
    );

    return response.data as ZTControllerMemberDetails;
  } catch (error) {
    const message =
      "[ZT CENTRAL] An error occurred while getting member_detail";
    throw new APIError(message, error as AxiosError);
  }
};

// Delete Network Member by ID
// https://docs.zerotier.com/service/v1/#operation/deleteControllerNetworkMember

export const member_delete = async ({
  nwid,
  memberId,
}: MemberDeleteInput): Promise<MemberDeleteResponse> => {
  try {
    const response: AxiosResponse = await axios.delete(
      `${ZT_ADDR}/network/${nwid}/member/${memberId}`,
      headers
    );
    return response.status as MemberDeleteResponse;
  } catch (error) {
    const message =
      "[ZT CENTRAL] An error occurred while getting member_delete";
    throw new APIError(message, error as AxiosError);
  }
};

// Update Network Member by ID
// https://docs.zerotier.com/service/v1/#operation/updateControllerNetworkMember
export const member_update = async (
  nwid: string,
  memberId: string,
  data
): Promise<ZTControllerMemberUpdate> => {
  try {
    const response: AxiosResponse = await axios.post(
      `${ZT_ADDR}/network/${nwid}/member/${memberId}`,
      data,
      headers
    );
    return response.data as ZTControllerMemberUpdate;
  } catch (error) {
    const message =
      "[ZT CENTRAL] An error occurred while getting member_update";
    throw new APIError(message, error as AxiosError);
  }
};

// Get all peers
// https://docs.zerotier.com/service/v1/#operation/getPeers
export const peers = async (): Promise<ZTControllerGetPeer> => {
  try {
    const response: AxiosResponse = await axios.get(`${ZT_ADDR}/peer`, headers);
    return response.data as ZTControllerGetPeer;
  } catch (error) {
    const message = "[ZT CENTRAL] An error occurred while getting peers";
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
      headers
    );

    if (!response.data) return null as ZTControllerGetPeer[];
    return response.data as ZTControllerGetPeer[];
  } catch (error) {
    return null;
  }
};
