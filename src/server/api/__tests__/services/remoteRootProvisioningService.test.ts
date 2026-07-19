import {
	buildSaveRemoteRootConfigCommand,
	buildChangeZerotierPortCommand,
	buildDistributePlanetCommand,
	buildRestoreOfficialPlanetCommand,
	parseRestoreOfficialPlanetMode,
	parseRemoteRootConfig,
} from "~/server/api/services/remoteRootProvisioningService";

describe("remoteRootProvisioningService", () => {
	it("parses remote ZeroTier state, IP candidates, and planet hashes", () => {
		const config = parseRemoteRootConfig(
			[
				"__ZTNET_INSTALLED__",
				"yes",
				"__ZTNET_SERVICE__",
				"active",
				"__ZTNET_STARTUP__",
				"enabled",
				"__ZTNET_IDENTITY__",
				"685a4651a7:0:755f89d16ea85e0f5a9db1cdd7f4846b73b193378cc17600a7261053409f08299f6cb516dfd566359c48073af8b6ae831f996745d5e10d18dc4dd487b8ad11e3",
				"__ZTNET_INFO__",
				"200 info 685a4651a7 1.16.2 ONLINE",
				"__ZTNET_LOCAL_CONF__",
				'{"settings":{"primaryPort":10001,"secondaryPort":10002,"allowSecondaryPort":true,"portMappingEnabled":true,"interfacePrefixBlacklist":["docker","veth"],"bind":["203.0.113.20","2001:db8::20"],"allowManagementFrom":["127.0.0.1/32"],"defaultBondingPolicy":"active-backup","multithreaded":true,"linuxKernelMode":false}}',
				"__ZTNET_INTERFACE_IPS__",
				"10.8.0.5",
				"2001:db8::5",
				"__ZTNET_PUBLIC_IPS__",
				"203.0.113.20",
				"__ZTNET_PLANET__",
				"planet abc123",
				"backup def456",
			].join("\n"),
		);

		expect(config.zerotierInstalled).toBe(true);
		expect(config.serviceStatus).toBe("RUNNING");
		expect(config.startupStatus).toBe("ENABLED");
		expect(config.zerotierVersion).toBe("1.16.2");
		expect(config.primaryPort).toBe(10001);
		expect(config.secondaryPort).toBe(10002);
		expect(config.allowSecondaryPort).toBe(true);
		expect(config.portMappingEnabled).toBe(true);
		expect(config.interfacePrefixBlacklist).toEqual(["docker", "veth"]);
		expect(config.bindAddresses).toEqual(["203.0.113.20", "2001:db8::20"]);
		expect(config.allowManagementFrom).toEqual(["127.0.0.1/32"]);
		expect(config.defaultBondingPolicy).toBe("active-backup");
		expect(config.multithreaded).toBe(true);
		expect(config.linuxKernelMode).toBe(false);
		expect(config.endpointCandidates).toEqual([
			{ ip: "10.8.0.5", source: "INTERFACE_IP", port: 10001 },
			{ ip: "2001:db8::5", source: "INTERFACE_IP", port: 10001 },
			{ ip: "203.0.113.20", source: "PUBLIC_IP", port: 10001 },
		]);
		expect(config.remotePlanetHash).toBe("abc123");
		expect(config.remoteOfficialPlanetHash).toBe("def456");
	});

	it("uses zerotier-one.port when local.conf does not define a primary port", () => {
		const config = parseRemoteRootConfig(
			[
				"__ZTNET_INSTALLED__",
				"yes",
				"__ZTNET_SERVICE__",
				"active",
				"__ZTNET_STARTUP__",
				"enabled",
				"__ZTNET_IDENTITY__",
				"685a4651a7:0:755f89d16ea85e0f5a9db1cdd7f4846b73b193378cc17600a7261053409f08299f6cb516dfd566359c48073af8b6ae831f996745d5e10d18dc4dd487b8ad11e3",
				"__ZTNET_INFO__",
				"200 info 685a4651a7 1.16.2 ONLINE",
				"__ZTNET_LOCAL_CONF__",
				"",
				"__ZTNET_PORT__",
				"10001",
				"__ZTNET_INTERFACE_IPS__",
				"10.8.0.5",
				"__ZTNET_PUBLIC_IPS__",
				"203.0.113.20",
				"__ZTNET_PLANET__",
				"planet abc123",
				"backup def456",
			].join("\n"),
		);

		expect(config.primaryPort).toBe(10001);
		expect(config.endpointCandidates).toContainEqual({
			ip: "203.0.113.20",
			source: "PUBLIC_IP",
			port: 10001,
		});
	});

	it("prefers local.conf primaryPort over zerotier-one.port", () => {
		const config = parseRemoteRootConfig(
			[
				"__ZTNET_INSTALLED__",
				"yes",
				"__ZTNET_SERVICE__",
				"active",
				"__ZTNET_STARTUP__",
				"enabled",
				"__ZTNET_IDENTITY__",
				"685a4651a7:0:755f89d16ea85e0f5a9db1cdd7f4846b73b193378cc17600a7261053409f08299f6cb516dfd566359c48073af8b6ae831f996745d5e10d18dc4dd487b8ad11e3",
				"__ZTNET_INFO__",
				"200 info 685a4651a7 1.16.2 ONLINE",
				"__ZTNET_LOCAL_CONF__",
				'{"settings":{"primaryPort":10002}}',
				"__ZTNET_PORT__",
				"10001",
				"__ZTNET_INTERFACE_IPS__",
				"10.8.0.5",
				"__ZTNET_PUBLIC_IPS__",
				"203.0.113.20",
				"__ZTNET_PLANET__",
				"planet abc123",
				"backup def456",
			].join("\n"),
		);

		expect(config.primaryPort).toBe(10002);
	});

	it("builds a port change command that writes local.conf and restarts ZeroTier", () => {
		const command = buildChangeZerotierPortCommand(10001);

		expect(command).toContain("/var/lib/zerotier-one/local.conf");
		expect(command).toContain("primaryPort");
		expect(command).toContain("10001");
		expect(command).toContain("restart zerotier-one");
	});

	it("writes portMappingEnabled false when secondary listening ports are disabled", () => {
		const command = buildSaveRemoteRootConfigCommand({
			primaryPort: 10001,
			secondaryPort: null,
			allowSecondaryPort: false,
			interfacePrefixBlacklist: [],
			bindAddresses: [],
			allowManagementFrom: [],
			defaultBondingPolicy: null,
			multithreaded: null,
			linuxKernelMode: null,
		});

		expect(command).toContain("allowSecondaryPort");
		expect(command).toContain("portMappingEnabled");
		expect(command).toContain("false");
	});

	it("builds a remote config command that writes supported local.conf settings and restarts ZeroTier", () => {
		const command = buildSaveRemoteRootConfigCommand({
			primaryPort: 10001,
			secondaryPort: 10002,
			allowSecondaryPort: true,
			interfacePrefixBlacklist: ["docker", "veth"],
			bindAddresses: ["203.0.113.20", "2001:db8::20"],
			allowManagementFrom: ["127.0.0.1/32"],
			defaultBondingPolicy: "active-backup",
			multithreaded: true,
			linuxKernelMode: false,
		});

		expect(command).toContain("/var/lib/zerotier-one/local.conf");
		expect(command).toContain("primaryPort");
		expect(command).toContain("secondaryPort");
		expect(command).toContain("allowSecondaryPort");
		expect(command).toContain("interfacePrefixBlacklist");
		expect(command).toContain("allowManagementFrom");
		expect(command).toContain("defaultBondingPolicy");
		expect(command).toContain("multithreaded");
		expect(command).toContain("linuxKernelMode");
		expect(command).toContain("restart zerotier-one");
	});

	it("builds a planet distribution command that backs up the remote planet and restarts ZeroTier", () => {
		const command = buildDistributePlanetCommand("cGxhbmV0");

		expect(command).toContain("planet.ztnet.official.bak");
		expect(command).toContain("base64 -d");
		expect(command).toContain("/var/lib/zerotier-one/planet");
		expect(command).toContain("restart zerotier-one");
	});

	it("builds a restore command that reports whether a backup was restored or a custom planet was removed", () => {
		const command = buildRestoreOfficialPlanetCommand();

		expect(command).toContain("__ZTNET_RESTORE_MODE__");
		expect(command).toContain("backup_restored");
		expect(command).toContain("custom_removed");
		expect(
			parseRestoreOfficialPlanetMode("__ZTNET_RESTORE_MODE__\nbackup_restored"),
		).toBe("backup_restored");
		expect(parseRestoreOfficialPlanetMode("__ZTNET_RESTORE_MODE__\ncustom_removed")).toBe(
			"custom_removed",
		);
	});
});
