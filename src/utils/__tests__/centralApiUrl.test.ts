/**
 * The ZeroTier Central API URL is typed in by a regular user, called by the
 * server and its response handed back. It must never reach anything but a
 * public https endpoint.
 */
import type { LookupOneOptions, LookupAllOptions } from "node:dns";
import {
	DEFAULT_CENTRAL_API_URL,
	normalizeCentralApiUrl,
	pinnedHttpsAgent,
	resolveCentralApiTarget,
} from "~/utils/centralApiUrl";
import { ALLOW_PRIVATE_TARGETS_ENV, BlockedUrlError } from "~/utils/ssrfGuard";

jest.mock("node:dns/promises", () => ({
	lookup: jest.fn(),
}));

import { lookup } from "node:dns/promises";

const mockedLookup = lookup as jest.MockedFunction<typeof lookup>;
const resolvesTo = (...addresses: string[]) =>
	mockedLookup.mockResolvedValue(
		addresses.map((address) => ({
			address,
			family: address.includes(":") ? 6 : 4,
		})) as never,
	);

const ENV_BACKUP = process.env[ALLOW_PRIVATE_TARGETS_ENV];

beforeEach(() => {
	mockedLookup.mockReset();
	delete process.env[ALLOW_PRIVATE_TARGETS_ENV];
});

afterAll(() => {
	if (ENV_BACKUP === undefined) delete process.env[ALLOW_PRIVATE_TARGETS_ENV];
	else process.env[ALLOW_PRIVATE_TARGETS_ENV] = ENV_BACKUP;
});

describe("normalizeCentralApiUrl", () => {
	it("treats an empty value as use the default", () => {
		expect(normalizeCentralApiUrl("")).toBeNull();
		expect(normalizeCentralApiUrl("  ")).toBeNull();
	});

	it("keeps a public https URL and drops trailing slashes", () => {
		expect(normalizeCentralApiUrl(DEFAULT_CENTRAL_API_URL)).toBe(DEFAULT_CENTRAL_API_URL);
		expect(normalizeCentralApiUrl(" https://central.example.com/api/v1// ")).toBe(
			"https://central.example.com/api/v1",
		);
	});

	it.each([
		// the local controller and other compose services
		["http://zerotier:9993", "needs to be HTTPS"],
		["http://api.zerotier.com/api/v1", "needs to be HTTPS"],
		["https://localhost:9993", "local address"],
		["https://127.0.0.1:9993", "private or reserved address"],
		["https://[::1]:9993", "private or reserved address"],
		["https://[::ffff:127.0.0.1]:9993", "private or reserved address"],
		// cloud metadata
		["https://169.254.169.254/latest/meta-data", "private or reserved address"],
		["https://100.100.100.200/latest/meta-data", "private or reserved address"],
		// private networks
		["https://10.0.0.5", "private network address"],
		["https://172.31.255.2:9993", "private network address"],
		["https://192.168.1.5/api/v1", "private network address"],
		["https://[fd00::1]/api/v1", "private network address"],
		// tricks that would let the caller choose the request path or host
		["https://api.zerotier.com/api/v1?x=", "query string or fragment"],
		["https://api.zerotier.com/api/v1#x", "query string or fragment"],
		["https://api.zerotier.com@10.0.0.5/", "private network address"],
		["https://user:pass@central.example.com/", "username or password"],
		["file:///var/lib/zerotier-one/authtoken.secret", "needs to be HTTPS"],
		["not a url", "Not a valid URL"],
	])("rejects %s", (input, message) => {
		expect(() => normalizeCentralApiUrl(input)).toThrow(BlockedUrlError);
		expect(() => normalizeCentralApiUrl(input)).toThrow(message);
	});

	it("names the setting in its errors, not webhooks", () => {
		expect(() => normalizeCentralApiUrl("https://10.0.0.5")).toThrow(
			"ZeroTier Central API URL",
		);
	});

	it("has no private network opt in, even when webhooks have one", () => {
		process.env[ALLOW_PRIVATE_TARGETS_ENV] = "true";

		expect(() => normalizeCentralApiUrl("https://192.168.1.5/api/v1")).toThrow(
			BlockedUrlError,
		);
		expect(() => normalizeCentralApiUrl("https://192.168.1.5/api/v1")).not.toThrow(
			ALLOW_PRIVATE_TARGETS_ENV,
		);
	});
});

describe("resolveCentralApiTarget", () => {
	it("uses the default URL when nothing is stored", async () => {
		resolvesTo("203.0.114.10");

		for (const stored of [null, undefined, ""]) {
			await expect(resolveCentralApiTarget(stored)).resolves.toMatchObject({
				url: DEFAULT_CENTRAL_API_URL,
				pinned: { hostname: "api.zerotier.com", address: "203.0.114.10", family: 4 },
			});
		}
	});

	it("pins the address that was checked", async () => {
		resolvesTo("203.0.114.10");

		const target = await resolveCentralApiTarget("https://central.example.com/api/");

		expect(target.url).toBe("https://central.example.com/api");
		expect(target.pinned).toMatchObject({
			hostname: "central.example.com",
			address: "203.0.114.10",
		});
	});

	it.each([
		["loopback", "127.0.0.1"],
		["cloud metadata", "169.254.169.254"],
		["a compose service", "172.31.255.2"],
		["a LAN host", "192.168.1.20"],
		["IPv6 loopback", "::1"],
		["mapped loopback", "::ffff:7f00:1"],
	])("refuses a hostname that resolves to %s", async (_name, address) => {
		resolvesTo(address);

		await expect(
			resolveCentralApiTarget("https://rebind.attacker.com/api/v1"),
		).rejects.toThrow(BlockedUrlError);
	});

	it("refuses private answers even with the webhook opt in", async () => {
		process.env[ALLOW_PRIVATE_TARGETS_ENV] = "true";
		resolvesTo("192.168.1.20");

		await expect(
			resolveCentralApiTarget("https://lan.attacker.com/api/v1"),
		).rejects.toThrow(BlockedUrlError);
	});

	it("skips internal answers and pins a public one", async () => {
		resolvesTo("127.0.0.1", "203.0.114.10");

		const target = await resolveCentralApiTarget("https://mixed.example.com/");

		expect(target.pinned.address).toBe("203.0.114.10");
	});

	it("fails closed on a value stored before the check existed", async () => {
		await expect(resolveCentralApiTarget("http://zerotier:9993")).rejects.toThrow(
			BlockedUrlError,
		);
		await expect(
			resolveCentralApiTarget("https://169.254.169.254/latest?x="),
		).rejects.toThrow(BlockedUrlError);
		expect(mockedLookup).not.toHaveBeenCalled();
	});

	it("reports a host that does not resolve", async () => {
		mockedLookup.mockRejectedValue(new Error("getaddrinfo ENOTFOUND"));

		await expect(
			resolveCentralApiTarget("https://nowhere.example.com/api/v1"),
		).rejects.toThrow(
			"Could not resolve the ZeroTier Central API host nowhere.example.com",
		);
	});
});

describe("pinnedHttpsAgent", () => {
	const pinned = {
		url: new URL("https://central.example.com/api"),
		hostname: "central.example.com",
		address: "203.0.114.10",
		family: 4 as const,
	};
	const agentLookup = () =>
		pinnedHttpsAgent(pinned).options.lookup as unknown as (
			hostname: string,
			options: LookupOneOptions | LookupAllOptions,
			callback: (...args: unknown[]) => void,
		) => void;

	it("answers with the pinned address instead of asking DNS again", () => {
		const callback = jest.fn();
		agentLookup()("central.example.com", {}, callback);

		expect(callback).toHaveBeenCalledWith(null, "203.0.114.10", 4);
		expect(mockedLookup).not.toHaveBeenCalled();
	});

	it("answers in the list form node asks for when it races address families", () => {
		const callback = jest.fn();
		agentLookup()("central.example.com", { all: true }, callback);

		expect(callback).toHaveBeenCalledWith(null, [{ address: "203.0.114.10", family: 4 }]);
	});

	it("refuses to connect anywhere else", () => {
		const callback = jest.fn();
		agentLookup()("zerotier", {}, callback);

		expect(callback.mock.calls[0][0]).toBeInstanceOf(Error);
	});
});
