import { isIP } from "node:net";
import type { PlanetRootEntry } from "./remoteRootPlanetService";
import { buildRemoteRootPlanetEntry } from "./remoteRootPlanetService";
import { executeSshCommand } from "./remoteRootSshService";

export type RemoteRootConnection = {
	host: string;
	port: number;
	user: string;
	privateKey: string;
};

export type RemoteRootConfig = {
	identity: string | null;
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
	zerotierVersion: string | null;
	rawLocalConf: string | null;
	zerotierInstalled: boolean;
	serviceStatus: "UNKNOWN" | "RUNNING" | "STOPPED" | "ERROR";
	startupStatus: "UNKNOWN" | "ENABLED" | "DISABLED" | "ERROR";
	endpointCandidates: RemoteRootEndpointCandidate[];
	remotePlanetHash: string | null;
	remoteOfficialPlanetHash: string | null;
};

export type RemoteRootEndpointCandidate = {
	ip: string;
	source: "SSH_HOST" | "PUBLIC_IP" | "INTERFACE_IP" | "DNS";
	port: number;
};

export type RemoteRootLocalConfigInput = {
	primaryPort: number;
	secondaryPort?: number | null;
	allowSecondaryPort?: boolean | null;
	interfacePrefixBlacklist?: string[];
	bindAddresses?: string[];
	allowManagementFrom?: string[];
	defaultBondingPolicy?: string | null;
	multithreaded?: boolean | null;
	linuxKernelMode?: boolean | null;
};

const readCommand = [
	"set -e",
	"echo __ZTNET_INSTALLED__",
	"if command -v zerotier-cli >/dev/null 2>&1; then echo yes; else echo no; fi",
	"echo __ZTNET_SERVICE__",
	"(systemctl is-active zerotier-one 2>/dev/null || service zerotier-one status 2>/dev/null | head -n 1 || true)",
	"echo __ZTNET_STARTUP__",
	"(systemctl is-enabled zerotier-one 2>/dev/null || true)",
	"echo __ZTNET_IDENTITY__",
	"sudo cat /var/lib/zerotier-one/identity.public 2>/dev/null || cat /var/lib/zerotier-one/identity.public 2>/dev/null || true",
	"echo __ZTNET_INFO__",
	"sudo zerotier-cli info 2>/dev/null || zerotier-cli info 2>/dev/null || true",
	"echo __ZTNET_LOCAL_CONF__",
	"sudo cat /var/lib/zerotier-one/local.conf 2>/dev/null || cat /var/lib/zerotier-one/local.conf 2>/dev/null || true",
	"echo __ZTNET_PORT__",
	"sudo cat /var/lib/zerotier-one/zerotier-one.port 2>/dev/null || cat /var/lib/zerotier-one/zerotier-one.port 2>/dev/null || true",
	"echo __ZTNET_INTERFACE_IPS__",
	"(ip -o -4 addr show scope global 2>/dev/null | awk '{split($4,a,\"/\"); print a[1]}' || true)",
	"(ip -o -6 addr show scope global 2>/dev/null | awk '{split($4,a,\"/\"); print a[1]}' || true)",
	"echo __ZTNET_PUBLIC_IPS__",
	"(curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null || true)",
	"(curl -fsS --max-time 5 https://api64.ipify.org 2>/dev/null || true)",
	"echo __ZTNET_PLANET__",
	"if [ -f /var/lib/zerotier-one/planet ]; then printf 'planet '; sha256sum /var/lib/zerotier-one/planet | awk '{print $1}'; else echo 'planet missing'; fi",
	"if [ -f /var/lib/zerotier-one/planet.ztnet.official.bak ]; then printf 'backup '; sha256sum /var/lib/zerotier-one/planet.ztnet.official.bak | awk '{print $1}'; else echo 'backup missing'; fi",
].join("; ");

export const REMOTE_ROOT_COMMANDS = {
	test: "true",
	install:
		"if command -v zerotier-cli >/dev/null 2>&1; then zerotier-cli -v; else curl -s https://install.zerotier.com | sudo bash; fi",
	upgrade:
		"if command -v apt-get >/dev/null 2>&1; then sudo apt-get update && sudo apt-get install -y zerotier-one; elif command -v yum >/dev/null 2>&1; then sudo yum install -y zerotier-one; elif command -v dnf >/dev/null 2>&1; then sudo dnf install -y zerotier-one; else zerotier-cli -v; fi",
	enableService:
		"(sudo systemctl enable --now zerotier-one || sudo service zerotier-one start || true) && (sudo zerotier-cli info || zerotier-cli info || true)",
	readConfig: readCommand,
	restartService:
		"(sudo systemctl restart zerotier-one || sudo service zerotier-one restart) && sleep 2 && (sudo zerotier-cli info || zerotier-cli info || true)",
};

export async function runRemoteRootCommand(
	connection: RemoteRootConnection,
	command: string,
) {
	return await executeSshCommand({
		host: connection.host,
		port: connection.port,
		user: connection.user,
		privateKey: connection.privateKey,
		command,
	});
}

function readSection(output: string, marker: string, nextMarker?: string): string {
	const start = output.indexOf(marker);
	if (start === -1) return "";
	const contentStart = start + marker.length;
	const end = nextMarker ? output.indexOf(nextMarker, contentStart) : -1;
	return output.slice(contentStart, end === -1 ? undefined : end).trim();
}

export function parseRemoteRootConfig(output: string): RemoteRootConfig {
	const installed = readSection(output, "__ZTNET_INSTALLED__", "__ZTNET_SERVICE__")
		.trim()
		.toLowerCase();
	const serviceSectionEnd = output.includes("__ZTNET_STARTUP__")
		? "__ZTNET_STARTUP__"
		: "__ZTNET_IDENTITY__";
	const serviceText = readSection(output, "__ZTNET_SERVICE__", serviceSectionEnd)
		.trim()
		.toLowerCase();
	const startup = output.includes("__ZTNET_STARTUP__")
		? readSection(output, "__ZTNET_STARTUP__", "__ZTNET_IDENTITY__").trim().toLowerCase()
		: "";
	const identity =
		readSection(output, "__ZTNET_IDENTITY__", "__ZTNET_INFO__")
			.split(/\r?\n/)
			.map((line) => line.trim())
			.find((line) => line.includes(":")) || null;
	const info = readSection(output, "__ZTNET_INFO__", "__ZTNET_LOCAL_CONF__");
	const hasPortMarker = output.includes("__ZTNET_PORT__");
	const rawLocalConf =
		readSection(
			output,
			"__ZTNET_LOCAL_CONF__",
			hasPortMarker ? "__ZTNET_PORT__" : "__ZTNET_INTERFACE_IPS__",
		) || null;
	const portFile = hasPortMarker
		? readSection(output, "__ZTNET_PORT__", "__ZTNET_INTERFACE_IPS__").trim()
		: "";

	let primaryPort = 9993;
	let secondaryPort: number | null = null;
	let allowSecondaryPort: boolean | null = null;
	let portMappingEnabled: boolean | null = null;
	let interfacePrefixBlacklist: string[] = [];
	let bindAddresses: string[] = [];
	let allowManagementFrom: string[] = [];
	let defaultBondingPolicy: string | null = null;
	let multithreaded: boolean | null = null;
	let linuxKernelMode: boolean | null = null;
	const portFileValue = Number.parseInt(portFile, 10);
	if (Number.isInteger(portFileValue) && portFileValue >= 1 && portFileValue <= 65535) {
		primaryPort = portFileValue;
	}
	if (rawLocalConf) {
		try {
			const parsed = JSON.parse(rawLocalConf) as { settings?: Record<string, unknown> };
			const settings = parsed.settings || {};
			if (isValidPort(settings.primaryPort)) {
				primaryPort = settings.primaryPort;
			}
			secondaryPort = isValidPort(settings.secondaryPort) ? settings.secondaryPort : null;
			allowSecondaryPort =
				typeof settings.allowSecondaryPort === "boolean"
					? settings.allowSecondaryPort
					: null;
			portMappingEnabled =
				typeof settings.portMappingEnabled === "boolean"
					? settings.portMappingEnabled
					: null;
			interfacePrefixBlacklist = parseStringArray(settings.interfacePrefixBlacklist);
			bindAddresses = parseStringArray(settings.bind);
			allowManagementFrom = parseStringArray(settings.allowManagementFrom);
			defaultBondingPolicy =
				typeof settings.defaultBondingPolicy === "string"
					? settings.defaultBondingPolicy
					: null;
			multithreaded =
				typeof settings.multithreaded === "boolean" ? settings.multithreaded : null;
			linuxKernelMode =
				typeof settings.linuxKernelMode === "boolean" ? settings.linuxKernelMode : null;
		} catch {
			primaryPort = 9993;
		}
	}

	const version =
		info
			.split(/\s+/)
			.find((part) => /^\d+\.\d+/.test(part))
			?.trim() || null;

	const interfaceIps = parseIps(
		readSection(output, "__ZTNET_INTERFACE_IPS__", "__ZTNET_PUBLIC_IPS__"),
	);
	const publicIps = parseIps(
		readSection(output, "__ZTNET_PUBLIC_IPS__", "__ZTNET_PLANET__"),
	);
	const planet = readSection(output, "__ZTNET_PLANET__");
	const remotePlanetHash = readHashLine(planet, "planet");
	const remoteOfficialPlanetHash = readHashLine(planet, "backup");

	return {
		identity,
		primaryPort,
		secondaryPort,
		allowSecondaryPort,
		portMappingEnabled,
		interfacePrefixBlacklist,
		bindAddresses,
		allowManagementFrom,
		defaultBondingPolicy,
		multithreaded,
		linuxKernelMode,
		zerotierVersion: version,
		rawLocalConf,
		zerotierInstalled: installed === "yes" || Boolean(version || identity),
		serviceStatus:
			serviceText.includes("active") || info.includes("ONLINE")
				? "RUNNING"
				: serviceText.includes("inactive") || serviceText.includes("stopped")
					? "STOPPED"
					: serviceText
						? "ERROR"
						: "UNKNOWN",
		startupStatus: parseStartupStatus(startup),
		endpointCandidates: [
			...interfaceIps.map((ip) => ({
				ip,
				source: "INTERFACE_IP" as const,
				port: primaryPort,
			})),
			...publicIps.map((ip) => ({
				ip,
				source: "PUBLIC_IP" as const,
				port: primaryPort,
			})),
		],
		remotePlanetHash,
		remoteOfficialPlanetHash,
	};
}

function parseStartupStatus(value: string): RemoteRootConfig["startupStatus"] {
	if (!value) return "UNKNOWN";
	if (value.includes("enabled")) return "ENABLED";
	if (
		value.includes("disabled") ||
		value.includes("static") ||
		value.includes("masked") ||
		value.includes("indirect")
	) {
		return "DISABLED";
	}
	return "ERROR";
}

function parseIps(value: string): string[] {
	return Array.from(
		new Set(
			value
				.split(/\s+/)
				.map((item) => item.trim())
				.filter((item) => isIP(item)),
		),
	);
}

function parseStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value
		.filter((item): item is string => typeof item === "string")
		.map((item) => item.trim())
		.filter(Boolean);
}

function isValidPort(value: unknown): value is number {
	return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 65535;
}

function readHashLine(value: string, label: string): string | null {
	const line = value
		.split(/\r?\n/)
		.map((item) => item.trim())
		.find((item) => item.startsWith(`${label} `));
	const hash = line?.split(/\s+/)[1];
	return hash && hash !== "missing" ? hash : null;
}

export async function readRemoteRootConfig(
	connection: RemoteRootConnection,
): Promise<RemoteRootConfig> {
	const result = await runRemoteRootCommand(connection, REMOTE_ROOT_COMMANDS.readConfig);
	return parseRemoteRootConfig(result.stdout);
}

export function buildManualIpPlanetEntry({
	name,
	identity,
	selectedIp,
	primaryPort,
}: {
	name: string;
	identity?: string | null;
	selectedIp?: string | null;
	primaryPort?: number | null;
}): PlanetRootEntry {
	if (selectedIp && !isIP(selectedIp)) {
		throw new Error("Selected endpoint must be an IP address.");
	}
	return buildRemoteRootPlanetEntry({ name, identity, selectedIp, primaryPort });
}

export function buildChangeZerotierPortCommand(port: number): string {
	if (!Number.isInteger(port) || port < 1 || port > 65535) {
		throw new Error("ZeroTier port must be between 1 and 65535.");
	}
	const python = [
		"import json,pathlib",
		'p=pathlib.Path("/var/lib/zerotier-one/local.conf")',
		's=p.read_text().strip() if p.exists() else ""',
		"d=json.loads(s) if s else {}",
		`d.setdefault("settings",{})["primaryPort"]=${port}`,
		"p.write_text(json.dumps(d,indent=2))",
	].join("; ");
	const fallback = `printf '%s' '{"settings":{"primaryPort":${port}}}' | sudo tee /var/lib/zerotier-one/local.conf >/dev/null`;
	return `sudo mkdir -p /var/lib/zerotier-one && (sudo python3 -c '${python}' || ${fallback}) && ${REMOTE_ROOT_COMMANDS.restartService}`;
}

export function buildSaveRemoteRootConfigCommand(
	config: RemoteRootLocalConfigInput,
): string {
	if (!isValidPort(config.primaryPort)) {
		throw new Error("ZeroTier port must be between 1 and 65535.");
	}
	if (config.secondaryPort !== null && config.secondaryPort !== undefined) {
		if (!isValidPort(config.secondaryPort)) {
			throw new Error("ZeroTier secondary port must be between 1 and 65535.");
		}
	}

	const settings: Record<string, unknown> = {
		primaryPort: config.primaryPort,
		secondaryPort: config.secondaryPort ?? null,
		allowSecondaryPort: config.allowSecondaryPort ?? null,
		portMappingEnabled: config.allowSecondaryPort === false ? false : null,
		interfacePrefixBlacklist: normalizeStringList(config.interfacePrefixBlacklist),
		bind: normalizeStringList(config.bindAddresses),
		allowManagementFrom: normalizeStringList(config.allowManagementFrom),
		defaultBondingPolicy: normalizeOptionalString(config.defaultBondingPolicy),
		multithreaded: config.multithreaded ?? null,
		linuxKernelMode: config.linuxKernelMode ?? null,
	};

	const payload = shellSingleQuote(JSON.stringify(settings));
	const python = shellSingleQuote(
		[
			"import json,pathlib,sys",
			'p=pathlib.Path("/var/lib/zerotier-one/local.conf")',
			's=p.read_text().strip() if p.exists() else ""',
			"d=json.loads(s) if s else {}",
			'st=d.setdefault("settings",{})',
			"payload=json.loads(sys.stdin.read())",
			"[st.pop(k,None) if v is None or v == [] else st.__setitem__(k,v) for k,v in payload.items()]",
			"p.write_text(json.dumps(d,indent=2))",
		].join("; "),
	);
	return [
		"sudo mkdir -p /var/lib/zerotier-one",
		`printf '%s' ${payload} | sudo python3 -c ${python}`,
		REMOTE_ROOT_COMMANDS.restartService,
	].join(" && ");
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
	if (!trimmed) return null;
	if (!/^[A-Za-z0-9_.:-]+$/.test(trimmed)) {
		throw new Error("ZeroTier advanced setting contains unsupported characters.");
	}
	return trimmed;
}

function shellSingleQuote(value: string): string {
	return `'${value.replace(/'/g, "'\\''")}'`;
}

export function buildDistributePlanetCommand(base64Planet: string): string {
	if (!/^[A-Za-z0-9+/=]+$/.test(base64Planet)) {
		throw new Error("Invalid planet payload.");
	}
	return [
		"sudo mkdir -p /var/lib/zerotier-one",
		"if [ -f /var/lib/zerotier-one/planet ]; then sudo cp -n /var/lib/zerotier-one/planet /var/lib/zerotier-one/planet.ztnet.official.bak; fi",
		`printf '%s' '${base64Planet}' | sudo base64 -d | sudo tee /var/lib/zerotier-one/planet >/dev/null`,
		REMOTE_ROOT_COMMANDS.restartService,
	].join(" && ");
}

export function buildRestoreOfficialPlanetCommand(): string {
	return [
		"if [ -f /var/lib/zerotier-one/planet.ztnet.official.bak ]; then sudo cp /var/lib/zerotier-one/planet.ztnet.official.bak /var/lib/zerotier-one/planet && echo __ZTNET_RESTORE_MODE__ && echo backup_restored; else sudo rm -f /var/lib/zerotier-one/planet && echo __ZTNET_RESTORE_MODE__ && echo custom_removed; fi",
		REMOTE_ROOT_COMMANDS.restartService,
	].join(" && ");
}

export function parseRestoreOfficialPlanetMode(
	output: string,
): "backup_restored" | "custom_removed" | null {
	const value = readSection(output, "__ZTNET_RESTORE_MODE__")
		.split(/\r?\n/)
		.map((line) => line.trim())
		.find(Boolean);
	return value === "backup_restored" || value === "custom_removed" ? value : null;
}
