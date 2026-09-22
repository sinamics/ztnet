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
 *
 * Two classes of address are distinguished:
 *
 * - reserved: loopback, link local (cloud metadata), unspecified, multicast,
 *   documentation, benchmarking, transition mechanisms that embed an IPv4
 *   target. Never a valid webhook receiver, always refused.
 * - private: RFC 1918, carrier grade NAT and IPv6 unique local. Not routable
 *   on the internet, but a legitimate receiver on a self hosted install (a
 *   compose service, a LAN host, a ZeroTier or Tailscale peer). Refused by
 *   default, allowed when `WEBHOOK_ALLOW_PRIVATE_TARGETS=true`.
 */

export const ALLOW_PRIVATE_TARGETS_ENV = "WEBHOOK_ALLOW_PRIVATE_TARGETS";

/** Read at call time, not module load, so a container restart is enough to change it. */
export const allowsPrivateTargets = (): boolean =>
	process.env[ALLOW_PRIVATE_TARGETS_ENV]?.trim().toLowerCase() === "true";

// IPv4 ranges that are never a valid outbound target
const RESERVED_IPV4_CIDRS = [
	"0.0.0.0/8", // this network
	"127.0.0.0/8", // loopback
	"169.254.0.0/16", // link local, also aws/gcp/azure metadata
	"192.0.0.0/24", // IETF protocol assignments
	"192.0.2.0/24", // TEST-NET-1
	"192.88.99.0/24", // 6to4 relay anycast
	"198.18.0.0/15", // benchmarking
	"198.51.100.0/24", // TEST-NET-2
	"203.0.113.0/24", // TEST-NET-3
	"224.0.0.0/4", // multicast
	"240.0.0.0/4", // reserved, includes 255.255.255.255
];

// IPv4 ranges a self hosted install may legitimately deliver to
const PRIVATE_IPV4_CIDRS = [
	"10.0.0.0/8", // private
	"172.16.0.0/12", // private, docker default bridge networks
	"192.168.0.0/16", // private
	"100.64.0.0/10", // carrier grade NAT, tailscale, also alibaba metadata
];

// IPv6 ranges that are never a valid outbound target
const RESERVED_IPV6_CIDRS = [
	"::/128", // unspecified
	"::1/128", // loopback
	"::/96", // deprecated IPv4 compatible, embeds an IPv4 target
	"64:ff9b::/96", // NAT64, embeds an IPv4 target
	"64:ff9b:1::/48", // local use NAT64, embeds an IPv4 target
	"100::/64", // discard only
	"2001::/32", // teredo, embeds an IPv4 target
	"2001:db8::/32", // documentation
	"2002::/16", // 6to4, embeds an IPv4 target
	"fe80::/10", // link local
	"ff00::/8", // multicast
];

// IPv6 ranges a self hosted install may legitimately deliver to
const PRIVATE_IPV6_CIDRS = [
	"fc00::/7", // unique local
];

// IPv4 mapped IPv6 (::ffff:a.b.c.d). The socket layer hands these to the IPv4
// stack, so they are checked as the IPv4 address they carry. `Address6.is4()`
// only recognises the dotted spelling, and the WHATWG URL parser rewrites
// `[::ffff:127.0.0.1]` to the hex spelling `[::ffff:7f00:1]`, so the subnet
// test is what actually catches URL literals.
const IPV4_MAPPED_IPV6 = new Address6("::ffff:0:0/96");

const RESERVED_IPV4_RANGES = RESERVED_IPV4_CIDRS.map((cidr) => new Address4(cidr));
const PRIVATE_IPV4_RANGES = PRIVATE_IPV4_CIDRS.map((cidr) => new Address4(cidr));
const RESERVED_IPV6_RANGES = RESERVED_IPV6_CIDRS.map((cidr) => new Address6(cidr));
const PRIVATE_IPV6_RANGES = PRIVATE_IPV6_CIDRS.map((cidr) => new Address6(cidr));

const LOCAL_HOSTNAMES = new Set(["localhost", "localhost.localdomain", "ip6-localhost"]);

export class BlockedUrlError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "BlockedUrlError";
	}
}

/** `URL.hostname` keeps the brackets around IPv6 literals, the socket layer does not want them. */
const stripBrackets = (hostname: string) => hostname.replace(/^\[|\]$/g, "");

export type AddressClass = "public" | "private" | "reserved";

/**
 * Classifies an IP literal. Anything that is not a valid IP literal is
 * `reserved`, so callers have to resolve the hostname first (fail closed).
 */
export const classifyIpAddress = (ip: string): AddressClass => {
	const version = isIP(ip);

	if (version === 4) {
		const address = new Address4(ip);
		if (RESERVED_IPV4_RANGES.some((range) => address.isInSubnet(range))) {
			return "reserved";
		}
		if (PRIVATE_IPV4_RANGES.some((range) => address.isInSubnet(range))) {
			return "private";
		}
		return "public";
	}

	if (version === 6) {
		const address = new Address6(ip);

		// ::ffff:127.0.0.1 and ::ffff:7f00:1 are IPv4 wearing a hat
		if (address.isInSubnet(IPV4_MAPPED_IPV6) || address.is4()) {
			return classifyIpAddress(address.to4().correctForm());
		}
		if (RESERVED_IPV6_RANGES.some((range) => address.isInSubnet(range))) {
			return "reserved";
		}
		if (PRIVATE_IPV6_RANGES.some((range) => address.isInSubnet(range))) {
			return "private";
		}
		return "public";
	}

	return "reserved";
};

/**
 * True if the address is not a valid outbound target under the current
 * configuration: reserved addresses always, private addresses unless
 * `WEBHOOK_ALLOW_PRIVATE_TARGETS=true`.
 */
export const isBlockedIpAddress = (ip: string): boolean => {
	const addressClass = classifyIpAddress(ip);
	if (addressClass === "reserved") return true;
	if (addressClass === "private") return !allowsPrivateTargets();
	return false;
};

const blockedAddressMessage = (rawUrl: string, addressClass: AddressClass) =>
	addressClass === "private"
		? `Webhook URL points at a private network address and is not allowed: ${rawUrl}. Set ${ALLOW_PRIVATE_TARGETS_ENV}=true to deliver webhooks to private networks.`
		: `Webhook URL points at a private or reserved address and is not allowed: ${rawUrl}`;

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
		throw new BlockedUrlError(blockedAddressMessage(rawUrl, classifyIpAddress(hostname)));
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
		// Tell the admin how to unblock a LAN receiver, but only when that is what
		// they hit. A name that resolves to loopback or metadata stays blocked.
		const onlyPrivate =
			resolved.length > 0 &&
			resolved.every((entry) => classifyIpAddress(entry.address) === "private");
		throw new BlockedUrlError(
			onlyPrivate
				? `Refusing to connect to ${hostname}, it resolves to a private network address. Set ${ALLOW_PRIVATE_TARGETS_ENV}=true to deliver webhooks to private networks.`
				: `Refusing to connect to ${hostname}, it resolves to a private or reserved address`,
		);
	}

	return {
		url,
		hostname,
		address: allowed.address,
		family: allowed.family as 4 | 6,
	};
};
