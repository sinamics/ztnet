import type { IncomingMessage } from "node:http";
import { isIP } from "node:net";
import { Address4, Address6 } from "ip-address";

/**
 * Works out which client a request comes from, for per client rate limiting.
 *
 * The address of the TCP peer cannot be forged, but behind a reverse proxy it
 * is the proxy for every client. `X-Forwarded-For` names the real client, but
 * anyone can send that header. So the header is only read when the peer is
 * trusted to be a proxy, and it is read from the right: each proxy appends the
 * address it saw, so the entry `hops` from the end was written by a proxy we
 * trust and everything before it by the client.
 *
 * `RATE_LIMIT_TRUSTED_PROXY_HOPS` sets the number of proxies in front of
 * ztnet. `0` never reads the header. Unset, one proxy is assumed when the
 * peer is a loopback or private address (the usual reverse proxy on the same
 * host or container network) and none otherwise.
 */
export const TRUSTED_PROXY_HOPS_ENV = "RATE_LIMIT_TRUSTED_PROXY_HOPS";

export const UNKNOWN_CLIENT = "unknown";

// IPv6 clients usually control a whole /64, so the limit applies to the prefix
const IPV6_CLIENT_PREFIX_BITS = 64;

const PRIVATE_IPV4_CIDRS = [
	"10.0.0.0/8",
	"127.0.0.0/8",
	"172.16.0.0/12",
	"192.168.0.0/16",
	"169.254.0.0/16",
	"100.64.0.0/10",
].map((cidr) => new Address4(cidr));

const PRIVATE_IPV6_CIDRS = ["::1/128", "fc00::/7", "fe80::/10"].map(
	(cidr) => new Address6(cidr),
);

const IPV4_MAPPED_IPV6 = new Address6("::ffff:0:0/96");

type ParsedAddress = { v4: Address4 } | { v6: Address6 };

const parseAddress = (value: string | undefined | null): ParsedAddress | null => {
	if (typeof value !== "string") return null;
	// drop brackets and zone id, forwarded entries may carry them
	const raw = value
		.trim()
		.replace(/^\[(.*)\](:\d+)?$/, "$1")
		.replace(/%.*$/, "");
	try {
		if (isIP(raw) === 4) return { v4: new Address4(raw) };
		if (isIP(raw) === 6) {
			const v6 = new Address6(raw);
			// An IPv4 client seen through a dual stack socket, written either as
			// ::ffff:a.b.c.d or in hex as ::ffff:aabb:ccdd. The subnet test covers
			// both spellings, the IPv4 address is the last 32 bits.
			if (v6.isInSubnet(IPV4_MAPPED_IPV6)) {
				const bits = v6.bigInt() & BigInt(0xffffffff);
				return { v4: Address4.fromBigInt(bits) };
			}
			return { v6 };
		}
	} catch {
		// not an address
	}
	return null;
};

const isPrivate = (address: ParsedAddress): boolean =>
	"v4" in address
		? PRIVATE_IPV4_CIDRS.some((cidr) => address.v4.isInSubnet(cidr))
		: PRIVATE_IPV6_CIDRS.some((cidr) => address.v6.isInSubnet(cidr));

const toKey = (address: ParsedAddress): string => {
	if ("v4" in address) return address.v4.correctForm();
	const prefix = new Address6(`${address.v6.correctForm()}/${IPV6_CLIENT_PREFIX_BITS}`);
	return `${prefix.startAddress().correctForm()}/${IPV6_CLIENT_PREFIX_BITS}`;
};

/** `null` when unset or invalid, which selects the automatic behaviour. */
const configuredHops = (): number | null => {
	const raw = process.env[TRUSTED_PROXY_HOPS_ENV]?.trim();
	if (!raw || !/^\d+$/.test(raw)) return null;
	return Number.parseInt(raw, 10);
};

const forwardedEntries = (req: Pick<IncomingMessage, "headers">): string[] => {
	const header = req.headers?.["x-forwarded-for"];
	const value = Array.isArray(header) ? header.join(",") : header;
	if (!value) return [];
	return value
		.split(",")
		.map((entry) => entry.trim())
		.filter(Boolean);
};

type RequestLike = {
	headers?: IncomingMessage["headers"];
	socket?: { remoteAddress?: string } | null;
};

/**
 * A stable key for the client behind a request: its IPv4 address or IPv6 /64.
 * Requests whose origin cannot be determined share the `unknown` key.
 */
export const getClientKey = (req: RequestLike | null | undefined): string => {
	if (!req) return UNKNOWN_CLIENT;

	const peer = parseAddress(req.socket?.remoteAddress);
	const hops = configuredHops() ?? (peer && isPrivate(peer) ? 1 : 0);

	if (hops > 0) {
		const entries = forwardedEntries(req as Pick<IncomingMessage, "headers">);
		// fewer entries than proxies: take the oldest one that exists
		const entry = entries[Math.max(entries.length - hops, 0)];
		const forwarded = parseAddress(entry);
		if (forwarded) return toKey(forwarded);
	}

	return peer ? toKey(peer) : UNKNOWN_CLIENT;
};
