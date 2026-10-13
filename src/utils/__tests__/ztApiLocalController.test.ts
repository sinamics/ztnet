/**
 * Every request to the local ZeroTier controller has to reach the same
 * controller with the same token, no matter which user makes it (#1019).
 * A user's own options row must never decide where the request goes.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import axios from "axios";
import type { UserContext } from "~/types/ctx";

jest.mock("axios");
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

import { prisma } from "~/server/db";
import {
	clearControllerOptionsCache,
	saveControllerOptions,
} from "~/server/api/services/controllerOptionsService";

const findUnique = prisma.controllerOptions.findUnique as jest.Mock;
const upsert = prisma.controllerOptions.upsert as jest.Mock;
const findUser = prisma.user.findFirst as jest.Mock;
const axiosGet = axios.get as jest.Mock;

const ctxFor = (id: string) => ({ session: { user: { id } } }) as unknown as UserContext;

const ENV_KEYS = ["ZT_ADDR", "ZT_SECRET", "ZT_SECRET_FILE", "IS_GITHUB_ACTION"] as const;
const ENV_BACKUP = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

let ztApi: typeof import("~/utils/ztApi");
let tokenDir: string;

/** Saves through the service and serves what it wrote, so the secret round trips encrypted. */
const storeControllerOptions = async (url: string | null, secret: string | null) => {
	await saveControllerOptions({ url, secret });
	const { update } = upsert.mock.calls.at(-1)[0];
	findUnique.mockResolvedValue({ id: 1, ...update });
};

const lastRequest = () => {
	const [url, config] = axiosGet.mock.calls.at(-1);
	return { url, token: config.headers["X-ZT1-Auth"] };
};

beforeAll(async () => {
	// the authtoken file is read once, when ztApi is first loaded
	tokenDir = fs.mkdtempSync(path.join(os.tmpdir(), "ztnet-token-"));
	const tokenFile = path.join(tokenDir, "authtoken.secret");
	fs.writeFileSync(tokenFile, "file-token");

	for (const key of ENV_KEYS) delete process.env[key];
	process.env.ZT_SECRET_FILE = tokenFile;

	ztApi = await import("~/utils/ztApi");
});

afterAll(() => {
	fs.rmSync(tokenDir, { recursive: true, force: true });
	for (const [key, value] of Object.entries(ENV_BACKUP)) {
		if (value === undefined) delete process.env[key];
		else process.env[key] = value;
	}
});

beforeEach(() => {
	clearControllerOptionsCache();
	for (const key of ["ZT_ADDR", "ZT_SECRET"]) delete process.env[key];
	findUnique.mockReset().mockResolvedValue(null);
	upsert.mockReset().mockResolvedValue({});
	findUser.mockReset();
	axiosGet.mockReset().mockResolvedValue({ data: [] });
});

describe("local controller target", () => {
	it("uses the default controller and the authtoken file when nothing is configured", async () => {
		await ztApi.get_controller_networks(ctxFor("alice"));

		expect(lastRequest()).toEqual({
			url: "http://zerotier:9993/controller/network",
			token: "file-token",
		});
	});

	it("sends every user to the controller an admin configured", async () => {
		await storeControllerOptions("http://10.20.30.40:9993", "admin-token");

		await ztApi.get_controller_networks(ctxFor("alice"));
		const alice = lastRequest();
		await ztApi.get_controller_networks(ctxFor("bob"));
		const bob = lastRequest();

		expect(alice).toEqual({
			url: "http://10.20.30.40:9993/controller/network",
			token: "admin-token",
		});
		expect(bob).toEqual(alice);
	});

	it("never reads the requesting user's options for a local request", async () => {
		// what a user could previously store on their own account
		findUser.mockResolvedValue({
			options: {
				localControllerUrl: "http://attacker.example",
				localControllerSecret: "",
			},
		});

		await ztApi.get_controller_networks(ctxFor("mallory"));
		await ztApi.peers(ctxFor("mallory"));

		expect(findUser).not.toHaveBeenCalled();
		for (const [url] of axiosGet.mock.calls) {
			expect(url).toMatch(/^http:\/\/zerotier:9993\//);
		}
	});

	it("lets ZT_ADDR and ZT_SECRET win over what an admin stored", async () => {
		await storeControllerOptions("http://10.20.30.40:9993", "admin-token");
		process.env.ZT_ADDR = "http://env-controller:9993";
		process.env.ZT_SECRET = "env-token";

		await ztApi.get_controller_networks(ctxFor("alice"));

		expect(lastRequest()).toEqual({
			url: "http://env-controller:9993/controller/network",
			token: "env-token",
		});
	});

	it("falls back to the authtoken file when only a URL is stored", async () => {
		await storeControllerOptions("http://10.20.30.40:9993", null);

		await ztApi.get_controller_networks(ctxFor("alice"));

		expect(lastRequest()).toEqual({
			url: "http://10.20.30.40:9993/controller/network",
			token: "file-token",
		});
	});
});
