import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { Address4, Address6 } from "ip-address";

/**
 * Guard for outbound requests to user supplied URLs (webhooks).
 *
 * ztnet usually runs in a privileged network position: it sits next to the
 * ZeroTier controller API and, in cloud deployments, next to the instance
 * metadata endpoint. A URL that an organization admin can type in must never
 * be able to reach those, so every outbound target is checked against the
 * non routable ranges and the connection is pinned to the address we checked.
 */

// IPv4 ranges that are not publicly routable (RFC 1918 / 5735 / 6598 and friends)
const BLOCKED_IPV4_CIDRS = [
	"0.0.0.0/8", // this network
	"10.0.0.0/8", // private
	"100.64.0.0/10", // carrier grade NAT, also alibaba metadata
	"127.0.0.0/8", // loopback
	"169.254.0.0/16", // link local, also aws/gcp/azure metadata
	"172.16.0.0/12", // private
	"192.0.0.0/24", // IETF protocol assignments
	"192.0.2.0/24", // TEST-NET-1
	"192.88.99.0/24", // 6to4 relay anycast
	"192.168.0.0/16", // private
	"198.18.0.0/15", // benchmarking
	"198.51.100.0/24", // TEST-NET-2
	"203.0.113.0/24", // TEST-NET-3
	"224.0.0.0/4", // multicast
	"240.0.0.0/4", // reserved, includes 255.255.255.255
];

const BLOCKED_IPV6_CIDRS = [
	"::/128", // unspecified
	"::1/128", // loopback
	"64:ff9b::/96", // NAT64, embeds an IPv4 target
	"100::/64", // discard only
	"2001:db8::/32", // documentation
	"2002::/16", // 6to4, embeds an IPv4 target
	"fc00::/7", // unique local
	"fe80::/10", // link local
	"ff00::/8", // multicast
];

const BLOCKED_IPV4_RANGES = BLOCKED_IPV4_CIDRS.map((cidr) => new Address4(cidr));
const BLOCKED_IPV6_RANGES = BLOCKED_IPV6_CIDRS.map((cidr) => new Address6(cidr));

const LOCAL_HOSTNAMES = new Set(["localhost", "localhost.localdomain", "ip6-localhost"]);

export class BlockedUrlError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "BlockedUrlError";
	}
}

/** `URL.hostname` keeps the brackets around IPv6 literals, the socket layer does not want them. */
const stripBrackets = (hostname: string) => hostname.replace(/^\[|\]$/g, "");

/**
 * True if the address is not publicly routable, and therefore not a valid
 * outbound target. Anything that is not a valid IP literal is treated as
 * blocked, so callers have to resolve the hostname first (fail closed).
 */
export const isBlockedIpAddress = (ip: string): boolean => {
	const version = isIP(ip);

	if (version === 4) {
		const address = new Address4(ip);
		return BLOCKED_IPV4_RANGES.some((range) => address.isInSubnet(range));
	}

	if (version === 6) {
		const address = new Address6(ip);

		// ::ffff:127.0.0.1 and friends are IPv4 wearing a hat
		if (address.is4()) {
			return isBlockedIpAddress(address.to4().correctForm());
		}
		return BLOCKED_IPV6_RANGES.some((range) => address.isInSubnet(range));
	}

	return true;
};

/**
 * Synchronous checks that do not need DNS: valid https URL, and not an
 * obviously local target. Used when a webhook is saved so the admin gets
 * immediate feedback. This is not the security boundary on its own, the
 * delivery time check in `resolvePublicTarget` is.
 */
export const assertPublicHttpsUrl = (rawUrl: string): URL => {
	let url: URL;

	try {
		url = new URL(rawUrl);
	} catch {
		throw new BlockedUrlError(`Not a valid URL: ${rawUrl}`);
	}

	if (url.protocol !== "https:") {
		throw new BlockedUrlError(`Webhook URL needs to be HTTPS: ${rawUrl}`);
	}

	const hostname = stripBrackets(url.hostname);
	if (!hostname) {
		throw new BlockedUrlError(`Webhook URL is missing a hostname: ${rawUrl}`);
	}

	const lowercased = hostname.toLowerCase();
	if (LOCAL_HOSTNAMES.has(lowercased) || lowercased.endsWith(".localhost")) {
		throw new BlockedUrlError(
			`Webhook URL points at a local address and is not allowed: ${rawUrl}`,
		);
	}

	if (isIP(hostname) && isBlockedIpAddress(hostname)) {
		throw new BlockedUrlError(
			`Webhook URL points at a private or reserved address and is not allowed: ${rawUrl}`,
		);
	}

	return url;
};

export interface PinnedTarget {
	url: URL;
	/** hostname without brackets, used for SNI and certificate validation */
	hostname: string;
	/** the resolved address the request must connect to */
	address: string;
	family: 4 | 6;
}

/**
 * Resolves the URL and returns the address the request has to connect to.
 * Callers must connect to `address` rather than to the hostname, otherwise a
 * second DNS lookup could return a different (internal) answer than the one we
 * validated here.
 */
export const resolvePublicTarget = async (rawUrl: string): Promise<PinnedTarget> => {
	const url = assertPublicHttpsUrl(rawUrl);
	const hostname = stripBrackets(url.hostname);

	if (isIP(hostname)) {
		return { url, hostname, address: hostname, family: isIP(hostname) as 4 | 6 };
	}

	const resolved = await lookup(hostname, { all: true });
	const allowed = resolved.find((entry) => !isBlockedIpAddress(entry.address));

	if (!allowed) {
		throw new BlockedUrlError(
			`Refusing to connect to ${hostname}, it resolves to a private or reserved address`,
		);
	}

	return {
		url,
		hostname,
		address: allowed.address,
		family: allowed.family as 4 | 6,
	};
};
