import { type Row } from "@tanstack/react-table";
import { MemberEntity } from "~/types/local/member";

export const sortingMemberHex = (
	rowA: Row<MemberEntity>,
	rowB: Row<MemberEntity>,
	columnId: string,
): number => {
	const a = rowA.original[columnId] as string;
	const b = rowB.original[columnId] as string;

	const numA = a ? BigInt(`0x${a}`) : a;
	const numB = b ? BigInt(`0x${b}`) : b;

	if (numA > numB) return 1;
	if (numA < numB) return -1;
	return 0;
};
export const hexToBigInt = (hex: string) => BigInt(`0x${hex}`);
export const sortIP = (ip: string) => {
	if (!ip) return BigInt(0);

	if (ip.includes(":")) {
		const fullAddress = ip
			.split(":")
			.map((hex) => hex.padStart(4, "0"))
			.join("");
		return hexToBigInt(fullAddress);
	}
	return BigInt(
		ip
			.split(".")
			.map(Number)
			.reduce((acc, val) => acc * 256 + val),
	);
};
export const sortingPhysicalIpAddress = (
	rowA: Row<MemberEntity>,
	rowB: Row<MemberEntity>,
): number => {
	const stripPort = (ip: string) => ip.split("/")[0];
	const a = rowA.original?.physicalAddress;
	const b = rowB.original?.physicalAddress;

	const convertToBigInt = (value: string | string[] | undefined): bigint => {
		if (Array.isArray(value)) {
			return value.length ? sortIP(stripPort(value[0])) : BigInt(0);
		}
		return value?.length ? sortIP(stripPort(value)) : BigInt(0);
	};

	const numA = convertToBigInt(a);
	const numB = convertToBigInt(b);

	if (numA > numB) return 1;
	if (numA < numB) return -1;
	return 0;
};
export const sortingIpAddress = (
	rowA: Row<MemberEntity>,
	rowB: Row<MemberEntity>,
	columnId?: string,
): number => {
	const stripPort = (ip: string) => ip.split("/")[0];
	let a: string | string[] | undefined;
	let b: string | string[] | undefined;

	if (columnId) {
		a = rowA.original[columnId] as string | string[];
		b = rowB.original[columnId] as string | string[];
	} else {
		a = rowA.original.peers?.physicalAddress;
		b = rowB.original?.peers?.physicalAddress;
	}

	const convertToBigInt = (value: string | string[] | undefined): bigint => {
		if (Array.isArray(value)) {
			return value.length ? sortIP(stripPort(value[0])) : BigInt(0);
		}
		return value?.length ? sortIP(stripPort(value)) : BigInt(0);
	};

	const numA = convertToBigInt(a);
	const numB = convertToBigInt(b);

	if (numA > numB) return 1;
	if (numA < numB) return -1;
	return 0;
};
