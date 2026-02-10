const cidrOptions = [
	"10.121.15.0/24",
	"10.121.16.0/24",
	"10.121.17.0/24",
	"10.121.18.0/24",
	"10.121.19.0/24",
	"10.121.20.0/24",
	"10.121.21.0/24",
	"10.121.22.0/24",
	"10.121.23.0/24",
	"10.121.24.0/24",
	"172.25.25.0/24",
	"172.25.26.0/24",
	"172.25.27.0/24",
	"172.25.28.0/24",
	"172.25.29.0/24",
	"172.25.30.0/24",
];

const generateCidr = (usedCidr: string[][], getRandom = false) => {
	// If getRandom is true, return one randomly
	if (getRandom) {
		return cidrOptions[Math.floor(Math.random() * cidrOptions.length)];
	}

	// Flatten the usedCidr array
	const flattenedUsedCidr = usedCidr.flat();

	// Count the frequency of each CIDR in the usedCidr array
	const cidrFrequency: { [key: string]: number } = {};
	for (const cidr of flattenedUsedCidr) {
		if (cidrFrequency[cidr]) {
			cidrFrequency[cidr]++;
		} else {
			cidrFrequency[cidr] = 1;
		}
	}

	// Filter the available CIDRs
	const availableCidr = cidrOptions.filter((cidr) => !flattenedUsedCidr.includes(cidr));

	// If there are available CIDRs, return the first one
	if (availableCidr.length > 0) {
		return availableCidr[0];
	}

	// If no available CIDRs, find the CIDR with the fewest occurrences
	let leastUsedCidr = cidrOptions[0];
	let minCount = Infinity;
	for (const cidr of cidrOptions) {
		const count = cidrFrequency[cidr] || 0;
		if (count < minCount) {
			minCount = count;
			leastUsedCidr = cidr;
		}
	}

	return leastUsedCidr;
};
export const IPv4gen = (CIDR: string | null, usedCidr, getRandom = false) => {
	const cidr = CIDR ? CIDR : generateCidr(usedCidr, getRandom);

	const [start, prefix] = cidr.split("/");
	const host32 = ((1 << (32 - parseInt(prefix))) - 1) >>> 0;
	const net = start.split(".").map((oct: string) => {
		return parseInt(oct);
	});

	let net32 = 0 >>> 0;
	net32 = (net[0] << 24) + (net[1] << 16) + (net[2] << 8) + net[3];
	net32 &= ~host32;

	const nwCidr = `${int32toIPv4String(net32)}/${prefix}`;
	const ipRangeStart = int32toIPv4String(net32 + 1);

	const bcast32 = net32 + host32;
	const ipRangeEnd = int32toIPv4String(bcast32 - 1);

	return {
		ipAssignmentPools: [{ ipRangeStart, ipRangeEnd }],
		routes: [{ target: nwCidr, via: null }],
		v4AssignMode: { zt: true },
		cidrOptions,
	};
};

function int32toIPv4String(int32: number) {
	let ipv4 = "";
	ipv4 = ((int32 & 0xff000000) >>> 24).toString();
	ipv4 += `.${((int32 & 0x00ff0000) >>> 16).toString()}`;
	ipv4 += `.${((int32 & 0x0000ff00) >>> 8).toString()}`;
	ipv4 += `.${(int32 & 0x000000ff).toString()}`;
	return ipv4;
}

export const getNetworkClassCIDR = (
	ipRanges: { ipRangeStart: string; ipRangeEnd: string }[],
): { target: string; via: null }[] => {
	const result: { target: string; via: null }[] = [];

	const ipToBinary = (ip: string): string =>
		ip
			.split(".")
			.map((octet) => parseInt(octet, 10).toString(2).padStart(8, "0"))
			.join("");

	const binaryToIp = (binary: string): string =>
		binary
			.match(/.{1,8}/g)
			?.map((bin) => parseInt(bin, 2).toString(10))
			.join(".") ?? "";

	const countCommonBits = (start: string, end: string): number => {
		for (let i = 0; i < start.length; i++) {
			if (start[i] !== end[i]) return i;
		}
		return start.length;
	};

	const ipToNumber = (ip: string): number =>
		ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0);

	for (const range of ipRanges) {
		if (ipToNumber(range.ipRangeStart) >= ipToNumber(range.ipRangeEnd)) {
			continue;
		}

		const binaryStart = ipToBinary(range.ipRangeStart);
		const binaryEnd = ipToBinary(range.ipRangeEnd);
		const commonBits = countCommonBits(binaryStart, binaryEnd);
		const networkBinary = binaryStart.substring(0, commonBits).padEnd(32, "0");
		const networkIp = binaryToIp(networkBinary);
		const cidr = `${networkIp}/${commonBits}`;
		result.push({ target: cidr, via: null });
	}

	return result;
};
