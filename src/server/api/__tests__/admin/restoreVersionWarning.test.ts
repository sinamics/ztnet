/**
 * Restoring a backup made by a different app version asks for confirmation
 * first (a warning, not a block). Nothing may be restored before the user
 * confirmed. These tests use a real tar.gz in a temp dir and restore neither
 * the database nor the ZeroTier folder, so only the version gate is exercised.
 */
jest.mock("~/utils/docker", () => ({ isRunningInDocker: () => true }));
jest.mock("~/utils/global", () => ({ globalSiteVersion: "v0.8.7" }));
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
	clearCentralCredentialsCache: jest.fn(),
}));
jest.mock("~/server/db", () => ({ prisma: {} }));

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { appRouter } from "~/server/api/root";
import { prisma } from "~/server/db";
import type { Session } from "~/lib/authTypes";

const admin = () =>
	appRouter.createCaller({
		session: { user: { id: "admin", role: "ADMIN" } } as unknown as Session,
		wss: null,
		prisma: prisma as never,
		res: null,
		req: null,
	});

const noRestore = { restoreDatabase: false, restoreZerotier: false };

let root: string;

const makeBackup = (fileName: string, version?: string) => {
	const src = fs.mkdtempSync(path.join(root, "src-"));
	const metadata = version === undefined ? {} : { version };
	fs.writeFileSync(path.join(src, "backup_metadata.json"), JSON.stringify(metadata));
	const backupDir = path.join(root, "tmp", "backups");
	fs.mkdirSync(backupDir, { recursive: true });
	execFileSync("tar", ["-czf", path.join(backupDir, fileName), "-C", src, "."]);
};

const extractLeftovers = () => {
	const dir = path.join(root, "tmp", "backups", "extract");
	return fs.existsSync(dir) ? fs.readdirSync(dir) : [];
};

beforeEach(() => {
	root = fs.mkdtempSync(path.join(os.tmpdir(), "ztnet-restore-"));
	jest.spyOn(process, "cwd").mockReturnValue(root);
});

afterEach(() => {
	jest.restoreAllMocks();
	fs.rmSync(root, { recursive: true, force: true });
});

describe("restoreBackup version warning", () => {
	it("asks for confirmation when the backup is from another version", async () => {
		makeBackup("old.tar.gz", "v0.8.6");

		const result = await admin().admin.restoreBackup({
			fileName: "old.tar.gz",
			...noRestore,
		});

		expect(result).toEqual({
			success: false,
			requiresConfirmation: true,
			backupVersion: "v0.8.6",
			currentVersion: "v0.8.7",
		});
		expect(extractLeftovers()).toEqual([]);
	});

	it("proceeds once the mismatch was confirmed", async () => {
		makeBackup("old.tar.gz", "v0.8.6");

		const result = await admin().admin.restoreBackup({
			fileName: "old.tar.gz",
			...noRestore,
			confirmVersionMismatch: true,
		});

		expect(result).toMatchObject({ success: true, requiresConfirmation: false });
		expect(extractLeftovers()).toEqual([]);
	});

	it("restores without asking when the versions match", async () => {
		makeBackup("same.tar.gz", "v0.8.7");

		const result = await admin().admin.restoreBackup({
			fileName: "same.tar.gz",
			...noRestore,
		});

		expect(result).toMatchObject({ success: true, requiresConfirmation: false });
	});

	it("does not warn for backups without a known version", async () => {
		makeBackup("legacy.tar.gz");
		makeBackup("unknown.tar.gz", "unknown");

		for (const fileName of ["legacy.tar.gz", "unknown.tar.gz"]) {
			const result = await admin().admin.restoreBackup({ fileName, ...noRestore });
			expect(result).toMatchObject({ success: true, requiresConfirmation: false });
		}
	});
});
