import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { RemoteRootLocalConfigInput } from "./remoteRootProvisioningService";

export type LocalZerotierConfig = {
	primaryPort: number;
	secondaryPort: number | null;
	allowSecondaryPort: boolean | null;
	portMappingEnabled: boolean | null;
	interfacePrefixBlacklist: string[];
	bindAddresses: string[];
	allowManagementFrom: string[];
	defaultBondingPolicy: string | null;
	multithreaded: boolean | null;
	linuxKernelMode: boolean | null;
	rawLocalConf: string | null;
	canWrite: boolean;
	configPath: string;
};

type LocalConfDocument = {
	settings?: Record<string, unknown>;
	[key: string]: unknown;
};

type LocalZerotierConfigOptions = {
	ztFolder?: string;
};

export type LocalZerotierConfigInput = RemoteRootLocalConfigInput;

const DEFAULT_PRIMARY_PORT = 9993;

export function readLocalZerotierConfig(
	options: Pick<LocalZerotierConfigOptions, "ztFolder"> = {},
): LocalZerotierConfig {
	const ztFolder = options.ztFolder || defaultZtFolder();
	const configPath = path.join(ztFolder, "local.conf");
	const portPath = path.join(ztFolder, "zerotier-one.port");
	const rawLocalConf = fs.existsSync(configPath)
		? fs.readFileSync(configPath, "utf8")
		: null;
	const document = parseLocalConf(rawLocalConf);
	const settings = document.settings || {};
	const portFileValue = readPortFile(portPath);
	const primaryPort = isValidPort(settings.primaryPort)
		? settings.primaryPort
		: portFileValue || DEFAULT_PRIMARY_PORT;

	return {
		primaryPort,
		secondaryPort: isValidPort(settings.secondaryPort) ? settings.secondaryPort : null,
		allowSecondaryPort:
			typeof settings.allowSecondaryPort === "boolean"
				? settings.allowSecondaryPort
				: null,
		portMappingEnabled:
			typeof settings.portMappingEnabled === "boolean"
				? settings.portMappingEnabled
				: null,
		interfacePrefixBlacklist: parseStringArray(settings.interfacePrefixBlacklist),
		bindAddresses: parseStringArray(settings.bind),
		allowManagementFrom: parseStringArray(settings.allowManagementFrom),
		defaultBondingPolicy:
			typeof settings.defaultBondingPolicy === "string"
				? settings.defaultBondingPolicy
				: null,
		multithreaded:
			typeof settings.multithreaded === "boolean" ? settings.multithreaded : null,
		linuxKernelMode:
			typeof settings.linuxKernelMode === "boolean" ? settings.linuxKernelMode : null,
		rawLocalConf,
		canWrite: canWriteZtFolder(ztFolder),
		configPath,
	};
}

export function saveLocalZerotierConfig(
	config: LocalZerotierConfigInput,
	options: LocalZerotierConfigOptions = {},
): LocalZerotierConfig {
	validateLocalZerotierConfig(config);
	const ztFolder = options.ztFolder || defaultZtFolder();
	const configPath = path.join(ztFolder, "local.conf");
	const rawLocalConf = fs.existsSync(configPath)
		? fs.readFileSync(configPath, "utf8")
		: null;
	const document = parseLocalConf(rawLocalConf);
	const settings = document.settings || {};

	const nextSettings: Record<string, unknown> = {
		...settings,
		primaryPort: config.primaryPort,
	};
	applyOptionalSetting(nextSettings, "secondaryPort", config.secondaryPort ?? null);
	applyOptionalSetting(
		nextSettings,
		"allowSecondaryPort",
		config.allowSecondaryPort ?? null,
	);
	applyOptionalSetting(
		nextSettings,
		"portMappingEnabled",
		config.allowSecondaryPort === false ? false : null,
	);
	applyOptionalSetting(
		nextSettings,
		"interfacePrefixBlacklist",
		normalizeStringList(config.interfacePrefixBlacklist),
	);
	applyOptionalSetting(nextSettings, "bind", normalizeStringList(config.bindAddresses));
	applyOptionalSetting(
		nextSettings,
		"allowManagementFrom",
		normalizeStringList(config.allowManagementFrom),
	);
	applyOptionalSetting(
		nextSettings,
		"defaultBondingPolicy",
		normalizeOptionalString(config.defaultBondingPolicy),
	);
	applyOptionalSetting(nextSettings, "multithreaded", config.multithreaded ?? null);
	applyOptionalSetting(nextSettings, "linuxKernelMode", config.linuxKernelMode ?? null);

	fs.mkdirSync(ztFolder, { recursive: true });
	fs.writeFileSync(
		configPath,
		JSON.stringify({ ...document, settings: nextSettings }, null, 2),
	);
	return readLocalZerotierConfig({ ztFolder });
}

function parseLocalConf(rawLocalConf: string | null): LocalConfDocument {
	if (!rawLocalConf?.trim()) return {};
	try {
		const parsed = JSON.parse(rawLocalConf) as LocalConfDocument;
		return parsed && typeof parsed === "object" ? parsed : {};
	} catch {
		throw new Error("Could not parse zerotier-one/local.conf.");
	}
}

function readPortFile(portPath: string): number | null {
	if (!fs.existsSync(portPath)) return null;
	const value = Number.parseInt(fs.readFileSync(portPath, "utf8").trim(), 10);
	return Number.isInteger(value) && value >= 1 && value <= 65535 ? value : null;
}

function validateLocalZerotierConfig(config: LocalZerotierConfigInput) {
	if (!isValidPort(config.primaryPort)) {
		throw new Error("ZeroTier port must be between 1 and 65535.");
	}
	if (
		config.secondaryPort !== null &&
		config.secondaryPort !== undefined &&
		!isValidPort(config.secondaryPort)
	) {
		throw new Error("ZeroTier secondary port must be between 1 and 65535.");
	}
}

function applyOptionalSetting(
	settings: Record<string, unknown>,
	key: string,
	value: unknown,
) {
	if (value === null || (Array.isArray(value) && value.length === 0)) {
		delete settings[key];
		return;
	}
	settings[key] = value;
}

function parseStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value
		.filter((item): item is string => typeof item === "string")
		.map((item) => item.trim())
		.filter(Boolean);
}

function normalizeStringList(value: string[] | undefined): string[] {
	return Array.from(
		new Set(
			(value || [])
				.map((item) => item.trim())
				.filter((item) => /^[A-Za-z0-9_.:/*-]+$/.test(item)),
		),
	);
}

function normalizeOptionalString(value: string | null | undefined): string | null {
	const trimmed = value?.trim();
	return trimmed || null;
}

function isValidPort(value: unknown): value is number {
	return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 65535;
}

function canWriteZtFolder(ztFolder: string): boolean {
	try {
		fs.accessSync(ztFolder, fs.constants.W_OK);
		return true;
	} catch {
		return false;
	}
}

function defaultZtFolder(): string {
	return os.platform() === "freebsd"
		? "/var/db/zerotier-one"
		: "/var/lib/zerotier-one";
}
