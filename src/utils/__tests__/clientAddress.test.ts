import {
	getClientKey,
	TRUSTED_PROXY_HOPS_ENV,
	UNKNOWN_CLIENT,
} from "~/utils/clientAddress";
import rateLimit from "~/utils/rateLimit";

const request = (remoteAddress: string | undefined, forwardedFor?: string) => ({
	headers: forwardedFor ? { "x-forwarded-for": forwardedFor } : {},
	socket: { remoteAddress },
});

describe("getClientKey", () => {
	afterEach(() => {
		delete process.env[TRUSTED_PROXY_HOPS_ENV];
	});

	it("uses the peer address for a direct connection", () => {
		expect(getClientKey(request("203.0.113.5"))).toBe("203.0.113.5");
	});

	it("ignores X-Forwarded-For from a public peer", () => {
		expect(getClientKey(request("203.0.113.5", "198.51.100.1"))).toBe("203.0.113.5");
	});

	it("reads the entry added by a proxy on a private address", () => {
		expect(getClientKey(request("172.18.0.2", "198.51.100.1"))).toBe("198.51.100.1");
		expect(getClientKey(request("::1", "198.51.100.1"))).toBe("198.51.100.1");
		expect(getClientKey(request("::ffff:127.0.0.1", "198.51.100.1"))).toBe(
			"198.51.100.1",
		);
	});

	it("does not let the client choose its key by sending its own entries", () => {
		// the proxy appends the address it saw, earlier entries are client input
		expect(getClientKey(request("172.18.0.2", "1.2.3.4, 5.6.7.8, 198.51.100.1"))).toBe(
			"198.51.100.1",
		);
	});

	it("falls back to the peer when the header holds no address", () => {
		expect(getClientKey(request("172.18.0.2", "not-an-address"))).toBe("172.18.0.2");
		expect(getClientKey(request("172.18.0.2"))).toBe("172.18.0.2");
	});

	it("never reads the header when the number of proxies is 0", () => {
		process.env[TRUSTED_PROXY_HOPS_ENV] = "0";
		expect(getClientKey(request("172.18.0.2", "198.51.100.1"))).toBe("172.18.0.2");
	});

	it("skips the configured number of proxies", () => {
		process.env[TRUSTED_PROXY_HOPS_ENV] = "2";
		// client -> cdn (appends client) -> proxy (appends cdn) -> ztnet
		expect(
			getClientKey(request("203.0.113.9", "9.9.9.9, 198.51.100.1, 203.0.113.80")),
		).toBe("198.51.100.1");
		// fewer entries than proxies: the oldest entry
		expect(getClientKey(request("203.0.113.9", "198.51.100.1"))).toBe("198.51.100.1");
	});

	it("maps IPv4 mapped IPv6 to the IPv4 address, in both spellings", () => {
		expect(getClientKey(request("::ffff:203.0.113.5"))).toBe("203.0.113.5");
		expect(getClientKey(request("::ffff:cb00:7105"))).toBe("203.0.113.5");
		// two IPv4 clients must not share an IPv6 prefix bucket
		expect(getClientKey(request("::ffff:c633:6401"))).toBe("198.51.100.1");
	});

	it("treats a hex spelled private peer as a proxy", () => {
		// ::ffff:ac12:2 is 172.18.0.2
		expect(getClientKey(request("::ffff:ac12:2", "198.51.100.1"))).toBe("198.51.100.1");
	});

	it("groups IPv6 clients by /64", () => {
		const a = getClientKey(request("2001:db8:1:2:aaaa::1"));
		const b = getClientKey(request("2001:db8:1:2:bbbb::2"));
		const other = getClientKey(request("2001:db8:1:3::1"));
		expect(a).toBe("2001:db8:1:2::/64");
		expect(b).toBe(a);
		expect(other).not.toBe(a);
	});

	it("uses one shared key when the origin is unknown", () => {
		expect(getClientKey(null)).toBe(UNKNOWN_CLIENT);
		expect(getClientKey(request(undefined))).toBe(UNKNOWN_CLIENT);
		expect(getClientKey({})).toBe(UNKNOWN_CLIENT);
	});
});

describe("rateLimit", () => {
	const res = { setHeader: jest.fn() };

	it("serves exactly `limit` requests per window and rejects the next one", async () => {
		const limiter = rateLimit({ interval: 60000 });
		const client = request("203.0.113.5");
		const headers = { setHeader: jest.fn() };
		const remaining = () =>
			headers.setHeader.mock.calls
				.filter(([name]) => name === "X-RateLimit-Remaining")
				.map(([, value]) => value);

		for (let i = 0; i < 10; i++) {
			await expect(limiter.check(client, headers, 10, "TOKEN")).resolves.toBeUndefined();
		}
		await expect(limiter.check(client, headers, 10, "TOKEN")).rejects.toBeUndefined();
		await expect(limiter.check(client, headers, 10, "TOKEN")).rejects.toBeUndefined();

		expect(remaining()).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0, 0]);
		expect(headers.setHeader).toHaveBeenCalledWith("X-RateLimit-Limit", 10);
	});

	it("counts each client separately", async () => {
		const limiter = rateLimit({ interval: 60000 });
		const noisy = request("203.0.113.5");

		await limiter.check(noisy, res, 3, "TOKEN");
		await limiter.check(noisy, res, 3, "TOKEN");
		await limiter.check(noisy, res, 3, "TOKEN");
		await expect(limiter.check(noisy, res, 3, "TOKEN")).rejects.toBeUndefined();

		await expect(
			limiter.check(request("198.51.100.1"), res, 3, "TOKEN"),
		).resolves.toBeUndefined();
	});

	it("counts each token separately for the same client", async () => {
		const limiter = rateLimit({ interval: 60000 });
		const client = request("203.0.113.5");

		await limiter.check(client, res, 2, "A");
		await limiter.check(client, res, 2, "A");
		await expect(limiter.check(client, res, 2, "A")).rejects.toBeUndefined();
		await expect(limiter.check(client, res, 2, "B")).resolves.toBeUndefined();
	});

	it("keeps a blocked client blocked when the store overflows", async () => {
		const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 5 });
		const noisy = request("203.0.113.5");

		await limiter.check(noisy, res, 3, "TOKEN");
		await limiter.check(noisy, res, 3, "TOKEN");
		await limiter.check(noisy, res, 3, "TOKEN");
		await expect(limiter.check(noisy, res, 3, "TOKEN")).rejects.toBeUndefined();

		// far more distinct clients than the store holds
		for (let i = 1; i <= 50; i++) {
			await limiter.check(request(`198.51.100.${i}`), res, 3, "TOKEN");
		}

		await expect(limiter.check(noisy, res, 3, "TOKEN")).rejects.toBeUndefined();
	});

	it("starts a new window once the old one has ended", async () => {
		jest.useFakeTimers();
		try {
			const limiter = rateLimit({ interval: 1000 });
			const client = request("203.0.113.5");

			await limiter.check(client, res, 2, "TOKEN");
			await limiter.check(client, res, 2, "TOKEN");
			await expect(limiter.check(client, res, 2, "TOKEN")).rejects.toBeUndefined();

			jest.advanceTimersByTime(1001);
			await expect(limiter.check(client, res, 2, "TOKEN")).resolves.toBeUndefined();
		} finally {
			jest.useRealTimers();
		}
	});

	it("works without a response object", async () => {
		const limiter = rateLimit();
		await expect(limiter.check(null, null, 5, "TOKEN")).resolves.toBeUndefined();
	});
});
