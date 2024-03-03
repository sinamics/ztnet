// check if ip is private
export function isPrivateIP(ip: string): boolean {
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

export function ip2long(ip: string) {
	const parts = ip.split(".");
	let res = 0;
	res += parseInt(parts[0]) << 24;
	res += parseInt(parts[1]) << 16;
	res += parseInt(parts[2]) << 8;
	res += parseInt(parts[3]);
	return res >>> 0; // Convert to unsigned number
}

export function long2ip(long: number) {
	const part1 = (long & 255).toString();
	const part2 = ((long >> 8) & 255).toString();
	const part3 = ((long >> 16) & 255).toString();
	const part4 = ((long >> 24) & 255).toString();

	return `${part4}.${part3}.${part2}.${part1}`;
}

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
