import fs from "fs";
import { IPv4gen } from "./IPv4gen";
import axios, { type AxiosError, type AxiosResponse } from "axios";
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
import { type CentralMemberConfig } from "~/types/central/members";
import {
	type NetworkBase,
	type CentralNetwork,
	type FlattenCentralNetwork,
} from "~/types/central/network";
import { type MemberEntity } from "~/types/local/member";
import { type NetworkEntity } from "~/types/local/network";
import { type NetworkAndMemberResponse } from "~/types/network";
import { UserContext } from "~/types/ctx";
import os from "os";

export let ZT_FOLDER: string;
export let ZT_FILE: string;

if (os.platform() === "freebsd") {
	ZT_FOLDER = "/var/db/zerotier-one";
	ZT_FILE = `${ZT_FOLDER}/authtoken.secret`;
} else {
	ZT_FOLDER = "/var/lib/zerotier-one";
	ZT_FILE = process.env.ZT_SECRET_FILE || `${ZT_FOLDER}/authtoken.secret`;
}

const LOCAL_ZT_ADDR = process.env.ZT_ADDR || "http://zerotier:9993";
const CENTRAL_ZT_ADDR = "https://api.zerotier.com/api/v1";

let ZT_SECRET = process.env.ZT_SECRET;

if (!ZT_SECRET) {
	if (process.env.IS_GITHUB_ACTION !== "true") {
		try {
			ZT_SECRET = fs.readFileSync(ZT_FILE, "utf8");
		} catch (error) {
			console.error("an error occurred while reading the ZT_SECRET");
			console.error(error);
		}
	} else {
		// GitHub Actions
		ZT_SECRET = "dummy_text_to_skip_gh";
	}
}

const getApiCredentials = async (
	ctx: UserContext,
): Promise<{
	ztCentralApiKey: string | null;
	ztCentralApiUrl: string | null;
	localControllerSecret: string | null;
	localControllerUrl: string | null;
}> => {
	const userWithOptions = await ctx.prisma.user.findFirst({
		where: {
			id: ctx.session.user.id,
		},
		select: {
			options: {
				select: {
					ztCentralApiKey: true,
					ztCentralApiUrl: true,
					localControllerSecret: true,
					localControllerUrl: true,
				},
			},
		},
	});

	// Return only the options. If options are not available, return null values.
	return (
		userWithOptions?.options || {
			ztCentralApiKey: null,
			ztCentralApiUrl: null,
			localControllerSecret: null,
			localControllerUrl: null,
		}
	);
};
interface GetOptionsResponse {
	ztCentralApiUrl?: string;
	localControllerUrl: string;
	headers: {
		Authorization?: string;
		"X-ZT1-Auth"?: string;
		"Content-Type": string;
	};
}

const getOptions = async (
	ctx: UserContext,
	isCentral = false,
): Promise<GetOptionsResponse> => {
	const { ztCentralApiKey, ztCentralApiUrl, localControllerUrl, localControllerSecret } =
		await getApiCredentials(ctx);

	if (isCentral) {
		return {
			ztCentralApiUrl: ztCentralApiUrl || CENTRAL_ZT_ADDR,
			localControllerUrl: null,
			headers: {
				Authorization: `token ${ztCentralApiKey}`,
				"Content-Type": "application/json",
			},
		};
	}

	return {
		localControllerUrl: localControllerUrl || LOCAL_ZT_ADDR,
		headers: {
			"X-ZT1-Auth": localControllerSecret || ZT_SECRET,
			"Content-Type": "application/json",
		},
	};
};

export const flattenCentralMember = (member: MemberEntity): MemberEntity => {
	const { id: nodeId, config, ...otherProps } = member;
	const flattenedMember = { nodeId, ...config, ...otherProps };
	return flattenedMember;
};

export const flattenCentralMembers = (members: MemberEntity[]): MemberEntity[] => {
	if (!members) return [];
	return members.map((member) => flattenCentralMember(member));
};

export const flattenNetwork = (network: CentralNetwork): FlattenCentralNetwork => {
	const { id: nwid, config, ...otherProps } = network;
	const flattenedNetwork = { nwid, ...config, ...otherProps };
	return flattenedNetwork;
};

export const flattenNetworks = (networks: CentralNetwork[]): FlattenCentralNetwork[] => {
	return networks.map((network) => flattenNetwork(network));
};

/*
 *    Axios Helper functions
 *
 */
const getData = async <T>(
	addr: string,
	headers: GetOptionsResponse["headers"],
): Promise<T> => {
	try {
		const { data } = await axios.get<T>(addr, { headers });
		return data;
	} catch (error) {
		if (axios.isAxiosError(error)) {
			const statusCode = error.response?.status;
			if (statusCode === 401) {
				throw new APIError("Invalid API Key", error);
			} else if (statusCode === 404) {
				throw new APIError("Endpoint Not Found", error);
			} // Add more status code checks here if needed
		}
		const message = `An error occurred fetching data from ${addr}`;
		throw new APIError(message, error as AxiosError);
	}
};
const postData = async <T, P = unknown>(
	addr: string,
	headers: GetOptionsResponse["headers"],
	payload: P,
): Promise<T> => {
	try {
		const { data } = await axios.post<T>(addr, payload, { headers });

		return data;
	} catch (error) {
		const message = `An error occurred while posting data to ${addr}`;
		throw new APIError(message, error as AxiosError);
	}
};

/* 
  Controller API for Admin
*/
interface Ictx {
	ctx: UserContext;
}
//Test API
export const ping_api = async function ({ ctx }: Ictx) {
	// get headers based on local or central api
	const { headers, ztCentralApiUrl } = await getOptions(ctx, true);
	const addr = `${ztCentralApiUrl}/network`;

	return await getData<ZTControllerStatus>(addr, headers);
};

// Check for controller function and return controller status.
// https://docs.zerotier.com/service/v1/#operation/getControllerStatus

//Get Version
export const get_controller_version = async function ({ ctx }: Ictx) {
	// get headers based on local or central api
	const { headers, localControllerUrl } = await getOptions(ctx, false);

	const addr = `${localControllerUrl}/controller`;

	try {
		return await getData<ZTControllerStatus>(addr, headers);
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
	ctx: UserContext,
	isCentral = false,
): Promise<NetworkBase[] | string[]> {
	// get headers based on local or central api
	const { headers, ztCentralApiUrl, localControllerUrl } = await getOptions(
		ctx,
		isCentral,
	);

	const addr = isCentral
		? `${ztCentralApiUrl}/network`
		: `${localControllerUrl}/controller/network`;

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

export const get_controller_status = async function (
	ctx: UserContext,
	isCentral: boolean,
): Promise<ZTControllerNodeStatus | CentralControllerStatus> {
	const { headers, ztCentralApiUrl, localControllerUrl } = await getOptions(
		ctx,
		isCentral,
	);

	const addr = isCentral ? `${ztCentralApiUrl}/status` : `${localControllerUrl}/status`;

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
	ctx: UserContext,
	name: string,
	ipAssignment,
	isCentral = false,
): Promise<ZTControllerCreateNetwork | FlattenCentralNetwork> => {
	// get headers based on local or central api
	const { headers, ztCentralApiUrl, localControllerUrl } = await getOptions(
		ctx,
		isCentral,
	);

	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const payload: Partial<CentralNetwork> = {
		name,
		private: true,
		...ipAssignment,
	};

	try {
		if (isCentral) {
			const data = await postData<CentralNetwork>(`${ztCentralApiUrl}/network`, headers, {
				config: { ...payload },
				description: "created with ztnet",
			});

			return flattenNetwork(data);
		} else {
			const controllerStatus = (await get_controller_status(
				ctx,
				isCentral,
			)) as ZTControllerNodeStatus;
			return await postData<ZTControllerCreateNetwork>(
				`${localControllerUrl}/controller/network/${controllerStatus.address}______`,
				headers,
				payload,
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
	ctx: UserContext,
	nwid: string,
	isCentral = false,
): Promise<HttpResponse> {
	// get headers based on local or central api
	const { headers, ztCentralApiUrl, localControllerUrl } = await getOptions(
		ctx,
		isCentral,
	);
	const addr = isCentral
		? `${ztCentralApiUrl}/network/${nwid}`
		: `${localControllerUrl}/controller/network/${nwid}`;

	try {
		const response = await axios.delete(addr, { headers });

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
	ctx: UserContext,
	nwid: string,
	isCentral = false,
) {
	// get headers based on local or central api
	const { headers, ztCentralApiUrl, localControllerUrl } = await getOptions(
		ctx,
		isCentral,
	);

	const addr = isCentral
		? `${ztCentralApiUrl}/network/${nwid}/member`
		: `${localControllerUrl}/controller/network/${nwid}/member`;

	// fetch members
	const fetchedMembers = await getData<MemberEntity[]>(addr, headers);
	// fix bug in zerotier version 1.12.1
	// https://github.com/zerotier/ZeroTierOne/issues/2114
	if (!isCentral && Array.isArray(fetchedMembers)) {
		const convertedMembers: { [key: string]: number } = {};
		for (const obj of fetchedMembers) {
			const key = Object.keys(obj)[0];
			convertedMembers[key] = obj[key];
		}
		return convertedMembers;
	}

	return fetchedMembers;
};

export const get_network = async function (
	ctx: UserContext,
	nwid: string,
	isCentral = false,
): Promise<NetworkEntity> {
	// get headers based on local or central api
	const { headers, localControllerUrl, ztCentralApiUrl } = await getOptions(
		ctx,
		isCentral,
	);

	const addr = isCentral
		? `${ztCentralApiUrl}/network/${nwid}`
		: `${localControllerUrl}/controller/network/${nwid}`;

	try {
		return await getData<NetworkEntity>(addr, headers);
	} catch (error) {
		throw new APIError(error, error as AxiosError);
	}
};

export const local_network_detail = async function (
	ctx: UserContext,
	nwid: string,
	isCentral = false,
): Promise<NetworkAndMemberResponse> {
	// get headers based on local or central api
	const { headers, localControllerUrl } = await getOptions(ctx, isCentral);

	try {
		// get all members for a specific network
		const members = await network_members(ctx, nwid);
		const network = await getData<NetworkEntity>(
			`${localControllerUrl}/controller/network/${nwid}`,
			headers,
		);
		let memberIds: string[] = [];

		if (Array.isArray(members)) {
			memberIds = members.map((obj) => Object.keys(obj)[0]);
		} else if (typeof members === "object") {
			memberIds = Object.keys(members);
		}

		const membersArr: MemberEntity[] = [];
		for (const [memberId] of Object.entries(members)) {
			const memberDetails = await getData<MemberEntity>(
				`${localControllerUrl}/controller/network/${nwid}/member/${memberId}`,
				headers,
			);

			membersArr.push(memberDetails);
		}

		return {
			network: { ...network },
			members: [...membersArr],
		};
	} catch (error) {
		throw new APIError(error, error as AxiosError);
	}
};
// Get network details
// https://docs.zerotier.com/service/v1/#operation/getNetwork

export const central_network_detail = async function (
	ctx: UserContext,
	nwid: string,
	isCentral = false,
): Promise<NetworkAndMemberResponse> {
	// get headers based on local or central api
	const { headers, ztCentralApiUrl, localControllerUrl } = await getOptions(
		ctx,
		isCentral,
	);
	try {
		const addr = isCentral
			? `${ztCentralApiUrl}/network/${nwid}`
			: `${localControllerUrl}/controller/network/${nwid}`;

		// get all members for a specific network
		const members = await network_members(ctx, nwid, isCentral);
		const network = await getData<CentralNetwork>(addr, headers);

		const membersArr = Array.isArray(members)
			? await Promise.all(
					members?.map(async (member) => {
						return await getData<MemberEntity>(
							`${addr}/member/${member?.nodeId}`,
							headers,
						);
					}),
			  )
			: [];

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
	ctx: UserContext;
	nwid: string;
	updateParams: Partial<NetworkEntity>;
	central?: boolean;
};

// Get network details
// https://docs.zerotier.com/service/v1/#operation/getNetwork
export const network_update = async function ({
	ctx,
	nwid,
	updateParams: payload,
	central = false,
}: networkUpdate): Promise<Partial<NetworkEntity>> {
	// get headers based on local or central api
	const { headers, ztCentralApiUrl, localControllerUrl } = await getOptions(ctx, central);
	const addr = central
		? `${ztCentralApiUrl}/network/${nwid}`
		: `${localControllerUrl}/controller/network/${nwid}`;

	try {
		return await postData<NetworkEntity>(addr, headers, payload);
	} catch (error) {
		const prefix = central ? "[CENTRAL] " : "";
		const message = `${prefix}An error occurred while getting network_update`;
		throw new APIError(message, error as AxiosError);
	}
};

// Delete Network Member by ID
// https://docs.zerotier.com/service/v1/#operation/deleteControllerNetworkMember

export const member_delete = async ({
	ctx,
	nwid,
	memberId,
	central = false,
}: MemberDeleteInput): Promise<Partial<MemberDeleteResponse>> => {
	// get headers based on local or central api
	const { headers, ztCentralApiUrl, localControllerUrl } = await getOptions(ctx, central);
	const addr = central
		? `${ztCentralApiUrl}/network/${nwid}/member/${memberId}`
		: `${localControllerUrl}/controller/network/${nwid}/member/${memberId}`;

	try {
		const response: AxiosResponse = await axios.delete(addr, { headers });
		return response.status as MemberDeleteResponse;
	} catch (error) {
		const prefix = central ? "[CENTRAL] " : "";
		const message = `${prefix}An error occurred while getting member_delete`;
		throw new APIError(message, error as AxiosError);
	}
};

type memberUpdate = {
	ctx: UserContext;
	nwid: string;
	memberId: string;
	updateParams: Partial<MemberEntity> | Partial<CentralMemberConfig>;
	central?: boolean;
};

// Update Network Member by ID
// https://docs.zerotier.com/service/v1/#operation/updateControllerNetworkMember
export const member_update = async ({
	ctx,
	nwid,
	memberId,
	updateParams: payload,
	central = false,
}: memberUpdate) => {
	// get headers based on local or central api
	const { headers, ztCentralApiUrl, localControllerUrl } = await getOptions(ctx, central);
	const addr = central
		? `${ztCentralApiUrl}/network/${nwid}/member/${memberId}`
		: `${localControllerUrl}/controller/network/${nwid}/member/${memberId}`;

	try {
		return await postData<MemberEntity>(addr, headers, payload);
	} catch (error) {
		const prefix = central ? "[CENTRAL] " : "";
		const message = `${prefix}An error occurred while getting member_update`;
		throw new APIError(message, error as AxiosError);
	}
};

// Get Network Member Details by ID
// https://docs.zerotier.com/service/v1/#operation/getControllerNetworkMember

export const member_details = async function (
	ctx: UserContext,
	nwid: string,
	memberId: string,
	central = false,
): Promise<MemberEntity> {
	// get headers based on local or central api
	const { headers, ztCentralApiUrl, localControllerUrl } = await getOptions(ctx, central);

	try {
		const addr = central
			? `${ztCentralApiUrl}/network/${nwid}/member/${memberId}`
			: `${localControllerUrl}/controller/network/${nwid}/member/${memberId}`;

		return await getData<MemberEntity>(addr, headers);
	} catch (error) {
		const message = "An error occurred while getting member_detail";
		throw new APIError(message, error as AxiosError);
	}
};

// Get all peers
// https://docs.zerotier.com/service/v1/#operation/getPeers
export const peers = async (ctx: UserContext): Promise<ZTControllerGetPeer> => {
	// get headers based on local or central api
	const { localControllerUrl } = await getOptions(ctx, false);

	const addr = `${localControllerUrl}/peer`;

	// get headers based on local or central api
	const { headers } = await getOptions(ctx, false);

	try {
		const response: AxiosResponse = await axios.get(addr, { headers });
		return response.data as ZTControllerGetPeer;
	} catch (error) {
		const message = "An error occurred while getting peers";
		throw new APIError(message, error as AxiosError);
	}
};

// Get information about a specific peer by Node ID.
// https://docs.zerotier.com/service/v1/#operation/getPeer
export const peer = async (ctx: UserContext, userZtAddress: string) => {
	const { localControllerUrl } = await getOptions(ctx, false);

	const addr = `${localControllerUrl}/peer/${userZtAddress}`;
	try {
		// get headers based on local or central api
		const { headers } = await getOptions(ctx, false);
		const response = await getData<ZTControllerGetPeer>(addr, headers);

		if (!response) return {} as ZTControllerGetPeer;
		return response as ZTControllerGetPeer;
	} catch (_error) {
		return [];
	}
};
