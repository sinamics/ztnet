import {
	ALLOW_PRIVATE_TARGETS_ENV,
	BlockedUrlError,
	allowsPrivateTargets,
	assertPublicHttpsUrl,
	classifyIpAddress,
	isBlockedIpAddress,
	resolvePublicTarget,
} from "~/utils/ssrfGuard";

jest.mock("node:dns/promises", () => ({
	lookup: jest.fn(),
}));

import { lookup } from "node:dns/promises";

const mockedLookup = lookup as jest.MockedFunction<typeof lookup>;

const RESERVED_IPS = [
	"127.0.0.1",
	"127.1.2.3",
	"169.254.169.254", // cloud metadata
	"0.0.0.0",
	"255.255.255.255",
	"224.0.0.1",
	"198.18.0.1",
	"192.0.2.1", // TEST-NET-1
	"::1",
	"::",
	"fe80::1",
	"ff02::1",
	"::ffff:127.0.0.1", // IPv4 mapped loopback, dotted spelling
	"::ffff:7f00:1", // IPv4 mapped loopback, hex spelling (what the URL parser emits)
	"::FFFF:7F00:1",
	"0:0:0:0:0:ffff:7f00:1",
	"::ffff:169.254.169.254",
	"::ffff:a9fe:a9fe", // IPv4 mapped metadata, hex spelling
	"::7f00:1", // deprecated IPv4 compatible loopback
	"::127.0.0.1",
	"64:ff9b::7f00:1", // NAT64 wrapped loopback
	"64:ff9b:1::7f00:1", // local use NAT64
	"2001::1", // teredo
	"2001:db8::1", // documentation
	"2002:7f00:1::1", // 6to4
	"100::1", // discard
];

const PRIVATE_IPS = [
	"10.20.30.40",
	"172.16.0.1",
	"172.31.255.255",
	"192.168.1.10",
	"100.100.100.200", // alibaba metadata, inside CGNAT range
	"100.64.0.1",
	"fd00::1",
	"fc00::1",
	"::ffff:192.168.1.20", // IPv4 mapped private, dotted spelling
	"::ffff:c0a8:114", // IPv4 mapped private, hex spelling
	"::ffff:a00:1", // ::ffff:10.0.0.1
];

const PUBLIC_IPS = [
	"8.8.8.8",
	"1.1.1.1",
	"93.184.216.34",
	"2606:4700:4700::1111",
	"::ffff:8.8.8.8", // IPv4 mapped public
	"::ffff:808:808",
];

const withPrivateTargets = (value: string | undefined) => {
	if (value === undefined) {
		delete process.env[ALLOW_PRIVATE_TARGETS_ENV];
	} else {
		process.env[ALLOW_PRIVATE_TARGETS_ENV] = value;
	}
};

beforeEach(() => {
	withPrivateTargets(undefined);
	mockedLookup.mockReset();
});

afterAll(() => {
	withPrivateTargets(undefined);
});

describe("classifyIpAddress", () => {
	it.each(RESERVED_IPS)("classifies %s as reserved", (ip) => {
		expect(classifyIpAddress(ip)).toBe("reserved");
	});

	it.each(PRIVATE_IPS)("classifies %s as private", (ip) => {
		expect(classifyIpAddress(ip)).toBe("private");
	});

	it.each(PUBLIC_IPS)("classifies %s as public", (ip) => {
		expect(classifyIpAddress(ip)).toBe("public");
	});

	it("fails closed on anything that is not an ip literal", () => {
		expect(classifyIpAddress("example.com")).toBe("reserved");
		expect(classifyIpAddress("")).toBe("reserved");
		expect(classifyIpAddress("[::1]")).toBe("reserved");
		expect(classifyIpAddress("127.0.0.1:9993")).toBe("reserved");
	});
});

describe("allowsPrivateTargets", () => {
	it.each(["true", "TRUE", " true "])("is on for %j", (value) => {
		withPrivateTargets(value);
		expect(allowsPrivateTargets()).toBe(true);
	});

	it.each([undefined, "", "false", "1", "yes", "on"])("is off for %j", (value) => {
		withPrivateTargets(value);
		expect(allowsPrivateTargets()).toBe(false);
	});
});

describe("isBlockedIpAddress", () => {
	describe("by default", () => {
		it.each([...RESERVED_IPS, ...PRIVATE_IPS])("blocks %s", (ip) => {
			expect(isBlockedIpAddress(ip)).toBe(true);
		});

		it.each(PUBLIC_IPS)("allows %s", (ip) => {
			expect(isBlockedIpAddress(ip)).toBe(false);
		});

		it("fails closed on anything that is not an ip literal", () => {
			expect(isBlockedIpAddress("example.com")).toBe(true);
			expect(isBlockedIpAddress("")).toBe(true);
		});
	});

	describe(`with ${ALLOW_PRIVATE_TARGETS_ENV}=true`, () => {
		beforeEach(() => withPrivateTargets("true"));

		it.each(RESERVED_IPS)("still blocks %s", (ip) => {
			expect(isBlockedIpAddress(ip)).toBe(true);
		});

		it.each([...PRIVATE_IPS, ...PUBLIC_IPS])("allows %s", (ip) => {
			expect(isBlockedIpAddress(ip)).toBe(false);
		});

		it("still fails closed on anything that is not an ip literal", () => {
			expect(isBlockedIpAddress("example.com")).toBe(true);
			expect(isBlockedIpAddress("")).toBe(true);
		});
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

	const RESERVED_URLS = [
		"https://127.0.0.1:9993/",
		"https://localhost/hook",
		"https://LOCALHOST/hook",
		"https://anything.localhost/hook",
		"https://169.254.169.254/",
		"https://[::1]/hook",
		"https://[::ffff:127.0.0.1]:9993/", // parser rewrites to [::ffff:7f00:1]
		"https://[::ffff:7f00:1]:9993/",
		"https://[::FFFF:7F00:1]:9993/",
		"https://[0:0:0:0:0:ffff:7f00:1]:9993/",
		"https://[::ffff:169.254.169.254]/",
		"https://[::ffff:a9fe:a9fe]/",
		"https://[::7f00:1]/",
		"https://[64:ff9b::7f00:1]/",
		"https://[2002:7f00:1::1]/",
	];

	const PRIVATE_URLS = [
		"https://192.168.1.5/hook",
		"https://10.0.0.5:8443/hook",
		"https://172.18.0.3:5678/hook",
		"https://100.100.100.200/",
		"https://[fd00::1]/hook",
		"https://[::ffff:192.168.1.20]/hook",
		"https://[::ffff:c0a8:114]/hook",
	];

	describe("by default", () => {
		it.each([...RESERVED_URLS, ...PRIVATE_URLS])("rejects internal target %s", (url) => {
			expect(() => assertPublicHttpsUrl(url)).toThrow(BlockedUrlError);
		});

		it("tells the admin how to allow a private network receiver", () => {
			expect(() => assertPublicHttpsUrl("https://192.168.1.5/hook")).toThrow(
				`Set ${ALLOW_PRIVATE_TARGETS_ENV}=true`,
			);
		});

		it("does not suggest the opt out for reserved addresses", () => {
			for (const url of RESERVED_URLS) {
				let message = "";
				try {
					assertPublicHttpsUrl(url);
				} catch (error) {
					message = (error as Error).message;
				}
				expect(message).not.toBe("");
				expect(message).not.toContain(ALLOW_PRIVATE_TARGETS_ENV);
			}
		});
	});

	describe(`with ${ALLOW_PRIVATE_TARGETS_ENV}=true`, () => {
		beforeEach(() => withPrivateTargets("true"));

		it.each(RESERVED_URLS)("still rejects reserved target %s", (url) => {
			expect(() => assertPublicHttpsUrl(url)).toThrow(BlockedUrlError);
		});

		it.each(PRIVATE_URLS)("accepts private target %s", (url) => {
			expect(assertPublicHttpsUrl(url)).toBeInstanceOf(URL);
		});

		it("still requires https", () => {
			expect(() => assertPublicHttpsUrl("http://192.168.1.5/hook")).toThrow(
				"needs to be HTTPS",
			);
		});
	});

	it("rejects malformed urls", () => {
		expect(() => assertPublicHttpsUrl("not a url")).toThrow(BlockedUrlError);
		expect(() => assertPublicHttpsUrl("https://")).toThrow(BlockedUrlError);
	});
});

describe("resolvePublicTarget", () => {
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

	it("rejects a hostname that resolves to a mapped loopback address", async () => {
		mockedLookup.mockResolvedValue([{ address: "::ffff:7f00:1", family: 6 }] as never);

		await expect(resolvePublicTarget("https://mapped.attacker.com/")).rejects.toThrow(
			BlockedUrlError,
		);
	});

	it("rejects a hostname that resolves to a private address by default", async () => {
		mockedLookup.mockResolvedValue([{ address: "192.168.1.20", family: 4 }] as never);

		await expect(resolvePublicTarget("https://n8n.home.example.com/")).rejects.toThrow(
			`Set ${ALLOW_PRIVATE_TARGETS_ENV}=true`,
		);
	});

	it("does not suggest the opt out when the name resolves to a reserved address", async () => {
		mockedLookup.mockResolvedValue([
			{ address: "192.168.1.20", family: 4 },
			{ address: "127.0.0.1", family: 4 },
		] as never);

		await expect(resolvePublicTarget("https://mixed.attacker.com/")).rejects.toThrow(
			BlockedUrlError,
		);
		await expect(resolvePublicTarget("https://mixed.attacker.com/")).rejects.not.toThrow(
			ALLOW_PRIVATE_TARGETS_ENV,
		);
	});

	it("rejects a hostname with no answers", async () => {
		mockedLookup.mockResolvedValue([] as never);

		await expect(resolvePublicTarget("https://nowhere.example.com/")).rejects.toThrow(
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

	it("rejects a mapped loopback literal without resolving it", async () => {
		await expect(resolvePublicTarget("https://[::ffff:127.0.0.1]:9993/")).rejects.toThrow(
			BlockedUrlError,
		);
		expect(mockedLookup).not.toHaveBeenCalled();
	});

	describe(`with ${ALLOW_PRIVATE_TARGETS_ENV}=true`, () => {
		beforeEach(() => withPrivateTargets("true"));

		it("pins to a private address the hostname resolves to", async () => {
			mockedLookup.mockResolvedValue([{ address: "192.168.1.20", family: 4 }] as never);

			const target = await resolvePublicTarget("https://n8n.home.example.com/hook");

			expect(target.address).toBe("192.168.1.20");
			expect(target.hostname).toBe("n8n.home.example.com");
			expect(target.family).toBe(4);
		});

		it("pins to a docker service address", async () => {
			mockedLookup.mockResolvedValue([{ address: "172.18.0.3", family: 4 }] as never);

			const target = await resolvePublicTarget("https://n8n:5678/hook");

			expect(target.address).toBe("172.18.0.3");
			expect(target.url.port).toBe("5678");
		});

		it("accepts a private ip literal", async () => {
			const target = await resolvePublicTarget("https://10.0.0.5:8443/hook");

			expect(mockedLookup).not.toHaveBeenCalled();
			expect(target.address).toBe("10.0.0.5");
		});

		it("still rejects a hostname that resolves to loopback", async () => {
			mockedLookup.mockResolvedValue([{ address: "127.0.0.1", family: 4 }] as never);

			await expect(resolvePublicTarget("https://loop.attacker.com/")).rejects.toThrow(
				BlockedUrlError,
			);
		});

		it("still rejects a hostname that resolves to the metadata endpoint", async () => {
			mockedLookup.mockResolvedValue([
				{ address: "169.254.169.254", family: 4 },
			] as never);

			await expect(resolvePublicTarget("https://metadata.attacker.com/")).rejects.toThrow(
				BlockedUrlError,
			);
		});

		it("still skips a reserved answer in favour of a private one", async () => {
			mockedLookup.mockResolvedValue([
				{ address: "127.0.0.1", family: 4 },
				{ address: "192.168.1.20", family: 4 },
			] as never);

			const target = await resolvePublicTarget("https://mixed.example.com/");
			expect(target.address).toBe("192.168.1.20");
		});

		it.each([
			"https://127.0.0.1:9993/",
			"https://[::ffff:127.0.0.1]:9993/",
			"https://[::ffff:7f00:1]:9993/",
			"https://169.254.169.254/",
			"https://[::ffff:a9fe:a9fe]/",
			"https://localhost/",
		])("still rejects reserved literal %s", async (url) => {
			await expect(resolvePublicTarget(url)).rejects.toThrow(BlockedUrlError);
			expect(mockedLookup).not.toHaveBeenCalled();
		});
	});
});
