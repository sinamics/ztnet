import { Address4, Address6 } from "ip-address";

/**
 * Checks if the given IP address is a private IP.
 * Private IP addresses are defined in the following ranges:
 * - 10.0.0.0 to 10.255.255.255
 * - 172.16.0.0 to 172.31.255.255
 * - 192.168.0.0 to 192.168.255.255
 *
 * @param ip The IP address to check.
 * @returns True if the IP address is private, false otherwise.
 */
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

/**
 * Converts an IP address to a 32-bit unsigned integer.
 *
 * @param ip - The IP address to convert.
 * @returns The 32-bit unsigned integer representation of the IP address.
 */
export function ip2long(ip: string) {
	const parts = ip.split(".");
	let res = 0;
	res += parseInt(parts[0]) << 24;
	res += parseInt(parts[1]) << 16;
	res += parseInt(parts[2]) << 8;
	res += parseInt(parts[3]);
	return res >>> 0; // Convert to unsigned number
}

/**
 * Converts a long integer representation of an IP address to its dotted-quad notation.
 *
 * @param long - The long integer representation of the IP address.
 * @returns The IP address in dotted-quad notation.
 */
export function long2ip(long: number) {
	const part1 = (long & 255).toString();
	const part2 = ((long >> 8) & 255).toString();
	const part3 = ((long >> 16) & 255).toString();
	const part4 = ((long >> 24) & 255).toString();

	return `${part4}.${part3}.${part2}.${part1}`;
}

/**
 * Finds the next available IP address within the given IP ranges.
 *
 * @param ranges - An array of IP ranges, each containing a start and end IP address.
 * @param allAssignedIPs - An array of all assigned IP addresses.
 * @returns The next available IP address, or `null` if no IP address is available.
 */
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

/**
 * Checks if a given CIDR (Classless Inter-Domain Routing) notation is valid.
 *
 * @param cidr - The CIDR notation to validate.
 * @returns A boolean indicating whether the CIDR notation is valid or not.
 */
export function isValidCIDR(cidr: string): boolean {
	const [ip, prefix] = cidr.split("/");
	const isIPv4 = isValidIP(ip);
	const isIPv6 = isValidIP(ip);
	const prefixNumber = parseInt(prefix);

	if (isIPv4) {
		return prefixNumber >= 0 && prefixNumber <= 32;
	}
	if (isIPv6) {
		return prefixNumber >= 0 && prefixNumber <= 128;
	}
	return false;
}

/**
 * Checks if the given IP address is valid.
 *
 * @param ip - The IP address to validate.
 * @returns `true` if the IP address is valid, `false` otherwise.
 */
export function isValidIP(ip: string): boolean {
	return Address4.isValid(ip) || Address6.isValid(ip);
}

/**
 * Checks if a given domain is valid.
 *
 * @param domain - The domain to be validated.
 * @returns `true` if the domain is valid, `false` otherwise.
 */
export function isValidDomain(domain: string): boolean {
	const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
	return domainRegex.test(domain);
}
