import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
	readLocalZerotierConfig,
	saveLocalZerotierConfig,
} from "~/server/api/services/localZerotierConfigService";

function makeZtFolder() {
	return fs.mkdtempSync(path.join(os.tmpdir(), "ztnet-local-zt-"));
}

describe("localZerotierConfigService", () => {
	it("returns default config when local.conf does not exist", () => {
		const ztFolder = makeZtFolder();

		const config = readLocalZerotierConfig({ ztFolder });

		expect(config.primaryPort).toBe(9993);
		expect(config.secondaryPort).toBeNull();
		expect(config.allowSecondaryPort).toBeNull();
		expect(config.interfacePrefixBlacklist).toEqual([]);
		expect(config.bindAddresses).toEqual([]);
		expect(config.allowManagementFrom).toEqual([]);
		expect(config.defaultBondingPolicy).toBeNull();
		expect(config.multithreaded).toBeNull();
		expect(config.linuxKernelMode).toBeNull();
		expect(config.canWrite).toBe(true);
	});

	it("reads supported ZeroTier local.conf settings", () => {
		const ztFolder = makeZtFolder();
		fs.writeFileSync(
			path.join(ztFolder, "local.conf"),
			JSON.stringify({
				settings: {
					primaryPort: 10001,
					secondaryPort: 10002,
					allowSecondaryPort: true,
					portMappingEnabled: false,
					interfacePrefixBlacklist: ["docker", "veth"],
					bind: ["203.0.113.10", "2001:db8::10"],
					allowManagementFrom: ["127.0.0.1/32"],
					defaultBondingPolicy: "active-backup",
					multithreaded: true,
					linuxKernelMode: false,
				},
			}),
		);

		const config = readLocalZerotierConfig({ ztFolder });

		expect(config).toMatchObject({
			primaryPort: 10001,
			secondaryPort: 10002,
			allowSecondaryPort: true,
			portMappingEnabled: false,
			interfacePrefixBlacklist: ["docker", "veth"],
			bindAddresses: ["203.0.113.10", "2001:db8::10"],
			allowManagementFrom: ["127.0.0.1/32"],
			defaultBondingPolicy: "active-backup",
			multithreaded: true,
			linuxKernelMode: false,
		});
	});

	it("saves supported settings while preserving unknown local.conf keys", () => {
		const ztFolder = makeZtFolder();
		fs.writeFileSync(
			path.join(ztFolder, "local.conf"),
			JSON.stringify({
				settings: {
					primaryPort: 9993,
					unknownSetting: "keep-me",
				},
				extraTopLevel: true,
			}),
		);

		const config = saveLocalZerotierConfig(
			{
				primaryPort: 10001,
				secondaryPort: null,
				allowSecondaryPort: false,
				interfacePrefixBlacklist: ["docker", "docker", ""],
				bindAddresses: ["203.0.113.10"],
				allowManagementFrom: ["127.0.0.1/32"],
				defaultBondingPolicy: "active-backup",
				multithreaded: true,
				linuxKernelMode: false,
			},
			{ ztFolder },
		);

		const saved = JSON.parse(
			fs.readFileSync(path.join(ztFolder, "local.conf"), "utf8"),
		);
		expect(saved.extraTopLevel).toBe(true);
		expect(saved.settings.unknownSetting).toBe("keep-me");
		expect(saved.settings.primaryPort).toBe(10001);
		expect(saved.settings.allowSecondaryPort).toBe(false);
		expect(saved.settings.portMappingEnabled).toBe(false);
		expect(saved.settings.interfacePrefixBlacklist).toEqual(["docker"]);
		expect(saved.settings.bind).toEqual(["203.0.113.10"]);
		expect(config.primaryPort).toBe(10001);
	});

	it("rejects invalid ports before writing local.conf", () => {
		const ztFolder = makeZtFolder();

		expect(() =>
			saveLocalZerotierConfig(
				{
					primaryPort: 70000,
					secondaryPort: null,
					allowSecondaryPort: null,
					interfacePrefixBlacklist: [],
					bindAddresses: [],
					allowManagementFrom: [],
					defaultBondingPolicy: null,
					multithreaded: null,
					linuxKernelMode: null,
				},
				{ ztFolder },
			),
		).toThrow("ZeroTier port must be between 1 and 65535.");
		expect(fs.existsSync(path.join(ztFolder, "local.conf"))).toBe(false);
	});
});
