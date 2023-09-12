import * as ztController from "~/utils/ztApi";
import { prisma } from "../db";
import { MemberEntity, Paths, Peers } from "~/types/local/member";
import { network_members } from "@prisma/client";
import { UserContext } from "~/types/ctx";

// This function checks if the given IP address is likely a private IP address
function isPrivateIP(ip: string): boolean {
	const ipInt = ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0);
	const ranges = [
		{ start: 10 << 24, end: (10 << 24) + (1 << 24) - 1 },
		{
			start: (172 << 24) + (16 << 16),
			end: (172 << 24) + (31 << 16) + (1 << 16) - 1,
		},
		{
			start: (192 << 24) + (168 << 16),
			end: (192 << 24) + (168 << 16) + (1 << 16) - 1,
		},
	];

	return ranges.some((range) => ipInt >= range.start && ipInt <= range.end);
}

export enum ConnectionStatus {
	Offline = 0,
	Relayed = 1,
	DirectLAN = 2,
	DirectWAN = 3,
	Controller = 4,
}

function determineConnectionStatus(member: MemberEntity): ConnectionStatus {
	const regex = new RegExp(`^${member.id}`);
	if (regex.test(member.nwid)) {
		return ConnectionStatus.Controller;
	}
	// fix for zt version 1.12. Return type of peer is object!.
	if (!member?.peers || Object.keys(member?.peers).length === 0) {
		return ConnectionStatus.Offline;
	}

	if (Array.isArray(member?.peers) && member?.peers.length === 0) {
		return ConnectionStatus.Offline;
	}

	if (member?.peers?.latency === -1 || member?.peers?.versionMajor === -1) {
		return ConnectionStatus.Relayed;
	}

	// Check if at least one path has a private IP
	if (member?.peers?.paths && member?.peers.paths.length > 0) {
		for (const path of member.peers.paths) {
			const ip = path.address.split("/")[0];
			if (isPrivateIP(ip)) {
				return ConnectionStatus.DirectLAN;
			}
		}
	}

	return ConnectionStatus.DirectWAN;
}

export const fetchZombieMembers = async (
	nwid: string,
	enrichedMembers: MemberEntity[],
) => {
	const getZombieMembersPromises = enrichedMembers.map((member) => {
		return prisma.network_members.findFirst({
			where: {
				nwid,
				id: member.id,
				deleted: true,
			},
		});
	});

	const zombieMembers = await Promise.all(getZombieMembersPromises);
	return zombieMembers.filter(Boolean);
};

export const enrichMembers = async (
	nwid: string,
	controllerMembers: MemberEntity[],
	peersByAddress: Peers[],
) => {
	const memberPromises = controllerMembers.map(async (member) => {
		const dbMember = await prisma.network_members.findFirst({
			where: { nwid, id: member.id },
			include: { notations: { include: { label: true } } },
		});

		if (!dbMember || dbMember.deleted) return null; // member doesn't belong to the specific user or is deleted

		const peers = peersByAddress[dbMember.address] || [];

		let activePreferredPath: Peers;
		if ("paths" in peers && peers.paths.length > 0) {
			activePreferredPath = peers.paths.find(
				(path: Paths) => path.active && path.preferred,
			);
		}

		if (!activePreferredPath) return { ...dbMember, ...member, peers: {} };

		const { address: physicalAddress, ...restOfActivePreferredPath } =
			activePreferredPath;

		return {
			...dbMember,
			...member,
			peers: { ...peers, physicalAddress, ...restOfActivePreferredPath },
		};
	});

	const members = await Promise.all(memberPromises);
	return members.filter(Boolean); // This will filter out any null or undefined values
};

export const fetchPeersForAllMembers = async (
	ctx: UserContext,
	members: MemberEntity[],
): Promise<Peers[]> => {
	const memberAddresses = members.map((member) => member.address);
	const peerPromises = memberAddresses.map((address) =>
		ztController.peer(ctx, address).catch(() => null),
	);

	const peers = await Promise.all(peerPromises);
	const peersByAddress: Peers[] = [];

	memberAddresses.forEach((address, index) => {
		peersByAddress[address] = peers[index];
	});

	return peersByAddress;
};

export const updateNetworkMembers = async (
	members: MemberEntity[],
	peersByAddress: Peers[],
) => {
	if (!members || members.length === 0) return;

	for (const member of members) {
		member.peers = peersByAddress[member.address] || [];
		member.conStatus = determineConnectionStatus(member);
	}

	await psql_updateMember(members);
};

const psql_updateMember = async (members: MemberEntity[]): Promise<void> => {
	for (const member of members) {
		const storeValues: Partial<network_members> = {
			id: member.id,
			address: member.address,
		};

		if (member.peers && member.conStatus !== 0) {
			storeValues.lastSeen = new Date();
		}

		const updateMember = await prisma.network_members.updateMany({
			where: { nwid: member.nwid, id: member.id },
			data: storeValues,
		});

		if (!updateMember.count) {
			try {
				await psql_addMember(member);
			} catch (error) {
				// rome-ignore lint/nursery/noConsoleLog: <explanation>
				console.log(error);
			}
		}
	}
};

const psql_addMember = async (member: MemberEntity) => {
	return await prisma.network_members.create({
		data: {
			id: member.id,
			lastSeen: new Date(),
			creationTime: new Date(),
			nwid_ref: {
				connect: { nwid: member.nwid },
			},
		},
	});
};

function ip2long(ip: string) {
	const parts = ip.split(".");
	let res = 0;
	res += parseInt(parts[0]) << 24;
	res += parseInt(parts[1]) << 16;
	res += parseInt(parts[2]) << 8;
	res += parseInt(parts[3]);
	return res >>> 0; // Convert to unsigned number
}

function long2ip(long: number) {
	const part1 = (long & 255).toString();
	const part2 = ((long >> 8) & 255).toString();
	const part3 = ((long >> 16) & 255).toString();
	const part4 = ((long >> 24) & 255).toString();

	return `${part4}.${part3}.${part2}.${part1}`;
}

// Function to get the next available IP from a range
// Function to get the next available IP from a list of ranges
export function getNextIP(
	ranges: { ipRangeStart: string; ipRangeEnd: string }[],
	allAssignedIPs: string[],
): string | null {
	// For each range in the list of ranges
	for (const range of ranges) {
		const start = ip2long(range.ipRangeStart);
		const end = ip2long(range.ipRangeEnd);

		for (let ipLong = start; ipLong <= end; ipLong++) {
			const ip = long2ip(ipLong);
			if (!allAssignedIPs.includes(ip)) {
				return ip;
			}
		}
	}

	// If we haven't returned by now, then there are no available IPs in the range
	return null;
}
