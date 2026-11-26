import { isBackupVersionMismatch } from "../backupVersion";

describe("isBackupVersionMismatch", () => {
	it("is false when the versions match", () => {
		expect(isBackupVersionMismatch("v0.8.7", "v0.8.7")).toBe(false);
		expect(isBackupVersionMismatch(" v0.8.7 ", "v0.8.7")).toBe(false);
	});

	it("is true when the versions differ, older or newer", () => {
		expect(isBackupVersionMismatch("v0.8.6", "v0.8.7")).toBe(true);
		expect(isBackupVersionMismatch("v0.9.0", "v0.8.7")).toBe(true);
		expect(isBackupVersionMismatch("main-abc1234", "v0.8.7")).toBe(true);
	});

	it("is false when the backup version is unknown", () => {
		expect(isBackupVersionMismatch(undefined, "v0.8.7")).toBe(false);
		expect(isBackupVersionMismatch(null, "v0.8.7")).toBe(false);
		expect(isBackupVersionMismatch("", "v0.8.7")).toBe(false);
		expect(isBackupVersionMismatch("unknown", "v0.8.7")).toBe(false);
	});

	it("is false when the running version is unknown (dev build)", () => {
		expect(isBackupVersionMismatch("v0.8.7", "development")).toBe(false);
		expect(isBackupVersionMismatch("v0.8.7", "unknown")).toBe(false);
		expect(isBackupVersionMismatch("v0.8.7", undefined)).toBe(false);
	});
});
