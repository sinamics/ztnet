import fs from "node:fs";
import path from "node:path";

describe("remote root database migration", () => {
	const migrationPath = path.join(
		process.cwd(),
		"prisma/migrations/20260625000000_remote_root_nodes/migration.sql",
	);

	it("creates the complete remote root schema in one final migration", () => {
		const sql = fs.readFileSync(migrationPath, "utf8");

		for (const statement of [
			'CREATE TYPE "RemoteRootStatus"',
			'CREATE TYPE "RemoteRootEndpointSource"',
			'CREATE TYPE "RemoteRootCredentialAuthType"',
			'CREATE TYPE "RemoteRootTaskType"',
			'CREATE TYPE "RemoteRootTaskStatus"',
			'CREATE TABLE "RemoteRootNode"',
			'CREATE TABLE "RemoteRootCredential"',
			'CREATE TABLE "RemoteRootTask"',
			'ALTER TABLE "RemoteRootCredential" ADD CONSTRAINT',
			'ALTER TABLE "RemoteRootTask" ADD CONSTRAINT',
		]) {
			expect(sql).toContain(statement);
		}
	});

	it("includes all final remote root runtime and config fields", () => {
		const sql = fs.readFileSync(migrationPath, "utf8");

		for (const column of [
			"zerotierInstalled",
			"serviceStatus",
			"startupStatus",
			"sshStatus",
			"panelStatus",
			"sshLastError",
			"panelLastError",
			"identity",
			"primaryPort",
			"secondaryPort",
			"allowSecondaryPort",
			"portMappingEnabled",
			"interfacePrefixBlacklist",
			"bindAddresses",
			"allowManagementFrom",
			"defaultBondingPolicy",
			"multithreaded",
			"linuxKernelMode",
			"identityMode",
			"selectedIps",
			"resolvedIps",
			"endpointCandidates",
			"remotePlanetHash",
			"remoteOfficialPlanetHash",
			"planetStatus",
			"lastReadAt",
			"lastPlanetSyncAt",
			"lastPanelCheckAt",
		]) {
			expect(sql).toContain(`"${column}"`);
		}
	});

	it("adds planet download auth mode to global options", () => {
		const sql = fs.readFileSync(migrationPath, "utf8");

		expect(sql).toContain('ALTER TABLE "GlobalOptions"');
		expect(sql).toContain('"planetDownloadAuthMode" TEXT NOT NULL DEFAULT');
	});
});
