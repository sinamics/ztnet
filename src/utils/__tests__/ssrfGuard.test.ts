import {
	BlockedUrlError,
	assertPublicHttpsUrl,
	isBlockedIpAddress,
	resolvePublicTarget,
} from "~/utils/ssrfGuard";

jest.mock("node:dns/promises", () => ({
	lookup: jest.fn(),
}));

import { lookup } from "node:dns/promises";

const mockedLookup = lookup as jest.MockedFunction<typeof lookup>;

describe("isBlockedIpAddress", () => {
	it.each([
		"127.0.0.1",
		"127.1.2.3",
		"169.254.169.254", // cloud metadata
		"10.20.30.40",
		"172.16.0.1",
		"172.31.255.255",
		"192.168.1.10",
		"100.100.100.200", // alibaba metadata, inside CGNAT range
		"0.0.0.0",
		"255.255.255.255",
		"224.0.0.1",
		"198.18.0.1",
		"::1",
		"::",
		"fd00::1",
		"fe80::1",
		"ff02::1",
		"::ffff:127.0.0.1", // IPv4 mapped loopback
		"::ffff:169.254.169.254",
		"64:ff9b::7f00:1", // NAT64 wrapped loopback
	])("blocks %s", (ip) => {
		expect(isBlockedIpAddress(ip)).toBe(true);
	});

	it.each(["8.8.8.8", "1.1.1.1", "93.184.216.34", "2606:4700:4700::1111"])(
		"allows %s",
		(ip) => {
			expect(isBlockedIpAddress(ip)).toBe(false);
		},
	);

	it("fails closed on anything that is not an ip literal", () => {
		expect(isBlockedIpAddress("example.com")).toBe(true);
		expect(isBlockedIpAddress("")).toBe(true);
	});
});

describe("assertPublicHttpsUrl", () => {
	it("accepts a normal https webhook endpoint", () => {
		expect(assertPublicHttpsUrl("https://hooks.example.com/abc").hostname).toBe(
			"hooks.example.com",
		);
	});

	it.each([
		"http://hooks.example.com/abc",
		"http://169.254.169.254/latest/meta-data/",
		"http://localhost:9993/",
		"file:///etc/passwd",
		"gopher://example.com/",
	])("rejects non https url %s", (url) => {
		expect(() => assertPublicHttpsUrl(url)).toThrow(BlockedUrlError);
	});

	it.each([
		"https://127.0.0.1:9993/",
		"https://localhost/hook",
		"https://LOCALHOST/hook",
		"https://anything.localhost/hook",
		"https://169.254.169.254/",
		"https://192.168.1.5/hook",
		"https://[::1]/hook",
		"https://[fd00::1]/hook",
	])("rejects internal target %s", (url) => {
		expect(() => assertPublicHttpsUrl(url)).toThrow(BlockedUrlError);
	});

	it("rejects malformed urls", () => {
		expect(() => assertPublicHttpsUrl("not a url")).toThrow(BlockedUrlError);
		expect(() => assertPublicHttpsUrl("https://")).toThrow(BlockedUrlError);
	});
});

describe("resolvePublicTarget", () => {
	beforeEach(() => {
		mockedLookup.mockReset();
	});

	it("pins to the resolved address so a later lookup cannot swap it out", async () => {
		mockedLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }] as never);

		const target = await resolvePublicTarget("https://hooks.example.com/abc");

		expect(target.address).toBe("93.184.216.34");
		expect(target.hostname).toBe("hooks.example.com");
		expect(target.family).toBe(4);
	});

	it("rejects a hostname that resolves to an internal address", async () => {
		mockedLookup.mockResolvedValue([{ address: "169.254.169.254", family: 4 }] as never);

		await expect(resolvePublicTarget("https://metadata.attacker.com/")).rejects.toThrow(
			BlockedUrlError,
		);
	});

	it("skips internal answers when the hostname also resolves to a public one", async () => {
		mockedLookup.mockResolvedValue([
			{ address: "10.0.0.5", family: 4 },
			{ address: "8.8.8.8", family: 4 },
		] as never);

		const target = await resolvePublicTarget("https://mixed.example.com/");
		expect(target.address).toBe("8.8.8.8");
	});

	it("does not resolve ip literals, they are checked directly", async () => {
		const target = await resolvePublicTarget("https://8.8.8.8/hook");

		expect(mockedLookup).not.toHaveBeenCalled();
		expect(target.address).toBe("8.8.8.8");
	});
});
