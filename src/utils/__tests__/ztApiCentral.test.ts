/**
 * ZeroTier Central requests go to a URL the user typed in. Every one of them
 * has to be made over a connection pinned to an address that was checked, and
 * a URL that fails the check must never reach the network.
 */
import { Agent } from "node:https";
import axios from "axios";
import type { UserContext } from "~/types/ctx";

jest.mock("axios");
jest.mock("node:dns/promises", () => ({
	lookup: jest.fn(),
}));
jest.mock("~/utils/docker", () => ({ isRunningInDocker: () => true }));
jest.mock("~/server/db", () => ({
	prisma: {
		controllerOptions: {
			findUnique: jest.fn(),
			updateMany: jest.fn(),
			upsert: jest.fn(),
		},
		user: { findFirst: jest.fn() },
	},
}));

import { lookup } from "node:dns/promises";
import { prisma } from "~/server/db";
import { clearControllerOptionsCache } from "~/server/api/services/controllerOptionsService";
import * as ztApi from "~/utils/ztApi";
import { BlockedUrlError } from "~/utils/ssrfGuard";

const mockedLookup = lookup as jest.MockedFunction<typeof lookup>;
const findUser = prisma.user.findFirst as jest.Mock;
const findControllerOptions = prisma.controllerOptions.findUnique as jest.Mock;
const axiosGet = axios.get as jest.Mock;
const axiosPost = axios.post as jest.Mock;
const axiosDelete = axios.delete as jest.Mock;

// Central credentials are cached per user id, so every test uses its own user
let userCounter = 0;
const newCtx = () =>
	({
		session: { user: { id: `central-user-${++userCounter}` } },
	}) as unknown as UserContext;

const storedCentralUrl = (ztCentralApiUrl: string | null) =>
	findUser.mockResolvedValue({
		options: { ztCentralApiKey: "user-central-key", ztCentralApiUrl },
	});

/** [url, axios config] of every request that was made, whatever the method */
const requests = () => [
	...axiosGet.mock.calls.map(([url, config]) => [url, config]),
	...axiosPost.mock.calls.map(([url, _payload, config]) => [url, config]),
	...axiosDelete.mock.calls.map(([url, config]) => [url, config]),
];

const NWID = "8056c2e21c000001";
const MEMBER = "abcdef0123";

// every exported function that can talk to ZeroTier Central
const centralCalls: [string, (ctx: UserContext) => Promise<unknown>][] = [
	["ping_api", (ctx) => ztApi.ping_api({ ctx })],
	["get_controller_networks", (ctx) => ztApi.get_controller_networks(ctx, true)],
	["get_controller_status", (ctx) => ztApi.get_controller_status(ctx, true)],
	["network_create", (ctx) => ztApi.network_create(ctx, "net", {}, true)],
	["network_delete", (ctx) => ztApi.network_delete(ctx, NWID, true)],
	["network_members", (ctx) => ztApi.network_members(ctx, NWID, true)],
	["get_network", (ctx) => ztApi.get_network(ctx, NWID, true)],
	[
		"central_network_and_members",
		(ctx) => ztApi.central_network_and_members(ctx, NWID, true),
	],
	[
		"network_update",
		(ctx) => ztApi.network_update({ ctx, nwid: NWID, central: true, updateParams: {} }),
	],
	[
		"member_update",
		(ctx) =>
			ztApi.member_update({
				ctx,
				nwid: NWID,
				memberId: MEMBER,
				central: true,
				updateParams: {},
			}),
	],
	[
		"member_delete",
		(ctx) => ztApi.member_delete({ ctx, nwid: NWID, memberId: MEMBER, central: true }),
	],
	["member_details", (ctx) => ztApi.member_details(ctx, NWID, MEMBER, true)],
];

beforeEach(() => {
	clearControllerOptionsCache();
	mockedLookup
		.mockReset()
		.mockResolvedValue([{ address: "203.0.114.10", family: 4 }] as never);
	findUser.mockReset();
	findControllerOptions.mockReset().mockResolvedValue(null);
	// a Central network with one member, enough for every function above
	axiosGet.mockReset().mockImplementation(async (url: string) => {
		if (url.endsWith("/network"))
			return { status: 200, data: [{ id: NWID, config: {} }] };
		if (url.endsWith("/member")) return { status: 200, data: [{ nodeId: MEMBER }] };
		return { status: 200, data: { id: NWID, config: {} } };
	});
	axiosPost
		.mockReset()
		.mockResolvedValue({ status: 200, data: { id: NWID, config: {} } });
	axiosDelete.mockReset().mockResolvedValue({ status: 200 });
});

describe("ZeroTier Central requests", () => {
	it("use the requesting user's own key and never the controller token", async () => {
		storedCentralUrl(null);

		await ztApi.get_controller_networks(newCtx(), true);

		const [url, config] = requests()[0];
		expect(url).toBe("https://api.zerotier.com/api/v1/network");
		expect(config.headers.Authorization).toBe("token user-central-key");
		expect(config.headers["X-ZT1-Auth"]).toBeUndefined();
		expect(findUser.mock.calls[0][0].select.options.select).toEqual({
			ztCentralApiKey: true,
			ztCentralApiUrl: true,
		});
	});

	it.each(centralCalls)(
		"%s is pinned to the checked address, follows no redirect and uses no proxy",
		async (_name, call) => {
			storedCentralUrl("https://central.example.com/api/v1/");

			await call(newCtx());

			expect(requests().length).toBeGreaterThan(0);
			for (const [url, config] of requests()) {
				expect(url).toMatch(/^https:\/\/central\.example\.com\/api\/v1\//);
				expect(config.maxRedirects).toBe(0);
				// with a proxy from the environment axios would drop the pinned agent
				expect(config.proxy).toBe(false);
				expect(config.httpsAgent).toBeInstanceOf(Agent);

				// the agent answers with the address that was checked
				const answer = jest.fn();
				config.httpsAgent.options.lookup("central.example.com", {}, answer);
				expect(answer).toHaveBeenCalledWith(null, "203.0.114.10", 4);
			}
		},
	);

	describe.each([
		["the local controller", "http://zerotier:9993", null],
		["cloud metadata", "https://169.254.169.254/latest", null],
		["a path the caller chose", "https://central.example.com/x?y=", null],
		["a name that resolves to loopback", "https://rebind.attacker.com/api", "127.0.0.1"],
		[
			"a name that resolves to a compose service",
			"https://rebind.attacker.com/api",
			"172.31.255.2",
		],
	])("with a stored URL pointing at %s", (_name, storedUrl, resolvesTo) => {
		it.each(centralCalls)("%s makes no request", async (_fn, call) => {
			storedCentralUrl(storedUrl);
			if (resolvesTo) {
				mockedLookup.mockResolvedValue([{ address: resolvesTo, family: 4 }] as never);
			}

			await expect(call(newCtx())).rejects.toThrow(BlockedUrlError);
			expect(requests()).toHaveLength(0);
		});
	});
});

describe("cached Central credentials", () => {
	const keyUsed = () => requests().at(-1)[1].headers.Authorization;
	const urlUsed = () => requests().at(-1)[0];

	it("are reused for a short while, so a save has to drop them", async () => {
		const ctx = newCtx();
		findUser.mockResolvedValue({
			options: { ztCentralApiKey: "old-key", ztCentralApiUrl: null },
		});
		await ztApi.get_controller_networks(ctx, true);

		// the user saves a new key and URL
		findUser.mockResolvedValue({
			options: {
				ztCentralApiKey: "new-key",
				ztCentralApiUrl: "https://central.example.com/api/v1",
			},
		});

		await ztApi.get_controller_networks(ctx, true);
		expect(keyUsed()).toBe("token old-key");

		ztApi.clearCentralCredentialsCache(ctx.session.user.id);

		await ztApi.get_controller_networks(ctx, true);
		expect(keyUsed()).toBe("token new-key");
		expect(urlUsed()).toBe("https://central.example.com/api/v1/network");
	});

	it("are dropped for that user only", async () => {
		const [alice, bob] = [newCtx(), newCtx()];
		findUser.mockResolvedValue({
			options: { ztCentralApiKey: "old-key", ztCentralApiUrl: null },
		});
		await ztApi.get_controller_networks(alice, true);
		await ztApi.get_controller_networks(bob, true);
		findUser.mockResolvedValue({
			options: { ztCentralApiKey: "new-key", ztCentralApiUrl: null },
		});

		ztApi.clearCentralCredentialsCache(alice.session.user.id);

		await ztApi.get_controller_networks(alice, true);
		expect(keyUsed()).toBe("token new-key");
		await ztApi.get_controller_networks(bob, true);
		expect(keyUsed()).toBe("token old-key");
	});
});

describe("local controller requests", () => {
	it("are not pinned or DNS checked, the controller is an admin setting", async () => {
		await ztApi.get_controller_networks(newCtx());

		const [url, config] = requests()[0];
		expect(url).toBe("http://zerotier:9993/controller/network");
		expect(config.httpsAgent).toBeUndefined();
		expect(config.maxRedirects).toBeUndefined();
		expect(config.proxy).toBeUndefined();
		expect(mockedLookup).not.toHaveBeenCalled();
	});
});
