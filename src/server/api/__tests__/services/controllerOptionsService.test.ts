/**
 * The local ZeroTier controller is one instance wide setting. These tests pin
 * down how it is stored: the URL is validated and normalized, the secret is
 * encrypted at rest, and a save is visible to the next read.
 */
jest.mock("~/utils/docker", () => ({ isRunningInDocker: () => true }));
jest.mock("~/server/db", () => ({
	prisma: {
		controllerOptions: {
			findUnique: jest.fn(),
			updateMany: jest.fn(),
			upsert: jest.fn(),
		},
	},
}));

import { prisma } from "~/server/db";
import {
	clearControllerOptionsCache,
	getDefaultLocalControllerUrl,
	getStoredControllerOptions,
	normalizeLocalControllerUrl,
	saveControllerOptions,
} from "~/server/api/services/controllerOptionsService";

const findUnique = prisma.controllerOptions.findUnique as jest.Mock;
const updateMany = prisma.controllerOptions.updateMany as jest.Mock;
const upsert = prisma.controllerOptions.upsert as jest.Mock;

const ENCRYPTED = /^[0-9a-f]{32}:[0-9a-f]+$/;

beforeEach(() => {
	clearControllerOptionsCache();
	findUnique.mockReset().mockResolvedValue(null);
	updateMany.mockReset().mockResolvedValue({ count: 1 });
	upsert.mockReset().mockResolvedValue({});
});

describe("normalizeLocalControllerUrl", () => {
	it("treats an empty value as use the default", () => {
		expect(normalizeLocalControllerUrl("")).toBeNull();
		expect(normalizeLocalControllerUrl("   ")).toBeNull();
	});

	it("keeps host, port and path, and drops trailing slashes", () => {
		expect(normalizeLocalControllerUrl(" http://10.20.30.40:9993/ ")).toBe(
			"http://10.20.30.40:9993",
		);
		expect(normalizeLocalControllerUrl("https://zt.example.com/controller//")).toBe(
			"https://zt.example.com/controller",
		);
		expect(normalizeLocalControllerUrl("http://[fd00::1]:9993")).toBe(
			"http://[fd00::1]:9993",
		);
	});

	it.each([
		["not a url", "not a valid URL"],
		["zerotier:9993", "http:// or https://"],
		["file:///var/lib/zerotier-one/authtoken.secret", "http:// or https://"],
		["http://user:pass@zerotier:9993", "username or password"],
		["http://zerotier:9993/?next=", "query string or fragment"],
		["http://zerotier:9993/#x", "query string or fragment"],
	])("rejects %s", (input, message) => {
		expect(() => normalizeLocalControllerUrl(input)).toThrow(message);
	});
});

describe("stored controller options", () => {
	it("returns nothing stored on a fresh install", async () => {
		await expect(getStoredControllerOptions()).resolves.toEqual({
			url: null,
			secret: null,
		});
		expect(getDefaultLocalControllerUrl()).toBe("http://zerotier:9993");
	});

	it("encrypts the secret on save and reads it back", async () => {
		await saveControllerOptions({ url: "http://10.20.30.40:9993", secret: "token" });

		const saved = upsert.mock.calls[0][0].update;
		expect(saved.localControllerUrl).toBe("http://10.20.30.40:9993");
		expect(saved.localControllerSecret).toMatch(ENCRYPTED);
		expect(saved.localControllerSecret).not.toContain("token");

		findUnique.mockResolvedValue({ id: 1, ...saved });
		await expect(getStoredControllerOptions()).resolves.toEqual({
			url: "http://10.20.30.40:9993",
			secret: "token",
		});
		expect(updateMany).not.toHaveBeenCalled();
	});

	it("only changes the fields that are passed, and clears with null", async () => {
		await saveControllerOptions({ url: "http://a:9993" });
		expect(upsert.mock.calls[0][0].update).toEqual({
			localControllerUrl: "http://a:9993",
		});

		await saveControllerOptions({ secret: null });
		expect(upsert.mock.calls[1][0].update).toEqual({ localControllerSecret: null });
	});

	it("uses a plain text secret from the migration and encrypts it in place", async () => {
		findUnique.mockResolvedValue({
			id: 1,
			localControllerUrl: null,
			localControllerSecret: "abcdefghijklmnopqrstuvwx",
		});

		await expect(getStoredControllerOptions()).resolves.toEqual({
			url: null,
			secret: "abcdefghijklmnopqrstuvwx",
		});

		const { where, data } = updateMany.mock.calls[0][0];
		// guarded by the old value, so a concurrent admin change is not overwritten
		expect(where).toEqual({ id: 1, localControllerSecret: "abcdefghijklmnopqrstuvwx" });
		expect(data.localControllerSecret).toMatch(ENCRYPTED);
	});

	it("ignores a secret it cannot decrypt instead of failing every request", async () => {
		const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
		findUnique.mockResolvedValue({
			id: 1,
			localControllerUrl: "http://a:9993",
			// well formed, but not encrypted with this instance's key
			localControllerSecret: `${"0".repeat(32)}:${"ab".repeat(16)}`,
		});

		await expect(getStoredControllerOptions()).resolves.toEqual({
			url: "http://a:9993",
			secret: null,
		});
		expect(consoleError).toHaveBeenCalled();
		consoleError.mockRestore();
	});

	it("caches reads and drops the cache on save", async () => {
		await getStoredControllerOptions();
		await getStoredControllerOptions();
		expect(findUnique).toHaveBeenCalledTimes(1);

		await saveControllerOptions({ url: "http://b:9993" });
		findUnique.mockResolvedValue({
			id: 1,
			localControllerUrl: "http://b:9993",
			localControllerSecret: null,
		});

		await expect(getStoredControllerOptions()).resolves.toMatchObject({
			url: "http://b:9993",
		});
		expect(findUnique).toHaveBeenCalledTimes(2);
	});
});
