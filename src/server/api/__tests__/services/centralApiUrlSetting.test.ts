/**
 * `auth.setZtApi` lets any signed in user choose the ZeroTier Central API URL
 * for their own account. The server calls that URL, so a value that is not a
 * public https endpoint has to be refused before it is stored.
 */
jest.mock("node:dns/promises", () => ({
	lookup: jest.fn(),
}));
jest.mock("~/utils/rateLimit", () => () => ({
	check: jest.fn().mockResolvedValue(true),
}));
jest.mock("~/utils/mail", () => ({
	sendMailWithTemplate: jest.fn(),
	mailTemplateMap: {},
}));
jest.mock("~/utils/ztApi", () => ({
	ZT_FOLDER: "/var/lib/zerotier-one",
	ping_api: jest.fn(),
}));
jest.mock("~/server/db", () => ({
	prisma: {
		user: { update: jest.fn() },
	},
}));

import { lookup } from "node:dns/promises";
import { appRouter } from "~/server/api/root";
import { prisma } from "~/server/db";
import type { Session } from "~/lib/authTypes";
import * as ztApi from "~/utils/ztApi";

const mockedLookup = lookup as jest.MockedFunction<typeof lookup>;
const updateUser = prisma.user.update as jest.Mock;
const pingApi = ztApi.ping_api as jest.Mock;

const caller = appRouter.createCaller({
	session: { user: { id: "regular-user", role: "USER" } } as unknown as Session,
	wss: null,
	prisma: prisma as never,
	res: null,
	req: null,
});

const storedOptions = () => updateUser.mock.calls[0][0].data.options.upsert.update;

beforeEach(() => {
	mockedLookup
		.mockReset()
		.mockResolvedValue([{ address: "203.0.114.10", family: 4 }] as never);
	updateUser.mockReset().mockResolvedValue({ id: "regular-user", options: {} });
	pingApi.mockReset().mockResolvedValue({});
});

describe("auth.setZtApi", () => {
	it.each([
		["the local controller", "http://zerotier:9993"],
		["the local controller over https", "https://localhost:9993"],
		["cloud metadata", "https://169.254.169.254/latest/meta-data"],
		["a private network address", "https://172.31.255.2:9993"],
		["a URL that swallows the API path", "https://api.zerotier.com/api/v1?x="],
		["a URL with credentials", "https://user:pass@central.example.com"],
		["something that is not a URL", "zerotier"],
	])("refuses %s and stores nothing", async (_name, ztCentralApiUrl) => {
		await expect(caller.auth.setZtApi({ ztCentralApiUrl })).rejects.toMatchObject({
			code: "BAD_REQUEST",
		});
		expect(updateUser).not.toHaveBeenCalled();
		expect(pingApi).not.toHaveBeenCalled();
	});

	it("refuses a public looking name that resolves to an internal address", async () => {
		mockedLookup.mockResolvedValue([{ address: "127.0.0.1", family: 4 }] as never);

		await expect(
			caller.auth.setZtApi({ ztCentralApiUrl: "https://rebind.attacker.com/api/v1" }),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
		expect(updateUser).not.toHaveBeenCalled();
	});

	it("refuses a name that does not resolve", async () => {
		mockedLookup.mockRejectedValue(new Error("getaddrinfo ENOTFOUND"));

		await expect(
			caller.auth.setZtApi({ ztCentralApiUrl: "https://nowhere.example.com" }),
		).rejects.toMatchObject({
			code: "BAD_REQUEST",
			message: expect.stringContaining("Could not resolve"),
		});
		expect(updateUser).not.toHaveBeenCalled();
	});

	it("stores a public https URL, normalized", async () => {
		await caller.auth.setZtApi({
			ztCentralApiUrl: " https://central.example.com/api/v1/ ",
		});

		expect(storedOptions().ztCentralApiUrl).toBe("https://central.example.com/api/v1");
	});

	it("resets to the default when the field is submitted empty", async () => {
		await caller.auth.setZtApi({ ztCentralApiUrl: "" });

		expect(storedOptions().ztCentralApiUrl).toBeNull();
		expect(mockedLookup).not.toHaveBeenCalled();
	});

	it("leaves the URL alone when only the key is saved", async () => {
		await caller.auth.setZtApi({ ztCentralApiKey: "key" });

		expect(storedOptions()).toEqual({
			ztCentralApiKey: "key",
			ztCentralApiUrl: undefined,
		});
	});
});
