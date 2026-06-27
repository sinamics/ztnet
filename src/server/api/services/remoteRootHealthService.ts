import dgram from "node:dgram";
import { isIP } from "node:net";
import { detectDnsDrift, resolveRootDomain } from "./remoteRootDnsService";
import {
	readRemoteRootConfig,
	REMOTE_ROOT_COMMANDS,
	runRemoteRootCommand,
	type RemoteRootEndpointCandidate,
	type RemoteRootConnection,
} from "./remoteRootProvisioningService";

export type RemoteRootHealthInput = {
	connection: RemoteRootConnection;
	endpointSource: "MANUAL_IP" | "DOMAIN";
	domainName?: string | null;
	selectedIp?: string | null;
	selectedIps?: unknown;
	checkPanelEndpoint?: typeof checkPanelEndpoint;
};

export type RemoteRootHealthResult = {
	status: "HEALTHY" | "DEGRADED" | "OFFLINE" | "ERROR";
	sshStatus: "UNKNOWN" | "CHECKING" | "OK" | "FAILED";
	panelStatus: "UNKNOWN" | "CHECKING" | "OK" | "DEGRADED" | "FAILED";
	identity: string | null;
	primaryPort: number;
	zerotierVersion: string | null;
	resolvedIps: string[];
	selectedIp: string | null;
	selectedIps: string[];
	endpointCandidates: RemoteRootEndpointCandidate[];
	zerotierInstalled: boolean;
	serviceStatus: "UNKNOWN" | "RUNNING" | "STOPPED" | "ERROR";
	startupStatus: "UNKNOWN" | "ENABLED" | "DISABLED" | "ERROR";
	secondaryPort: number | null;
	allowSecondaryPort: boolean | null;
	portMappingEnabled: boolean | null;
	interfacePrefixBlacklist: string[];
	bindAddresses: string[];
	allowManagementFrom: string[];
	defaultBondingPolicy: string | null;
	multithreaded: boolean | null;
	linuxKernelMode: boolean | null;
	remotePlanetHash: string | null;
	remoteOfficialPlanetHash: string | null;
	sshError: string | null;
	panelError: string | null;
	lastError: string | null;
};

type PanelEndpointCheckResult = {
	ok: boolean;
	error?: string | null;
};

type PanelEndpointSummary = {
	panelStatus: RemoteRootHealthResult["panelStatus"];
	panelError: string | null;
};

async function checkPanelEndpoint({
	selectedIp,
	primaryPort,
}: {
	selectedIp: string | null;
	primaryPort: number;
}): Promise<PanelEndpointCheckResult> {
	if (!selectedIp || !isIP(selectedIp)) {
		return { ok: false, error: "No selected endpoint IP is configured." };
	}
	if (!Number.isInteger(primaryPort) || primaryPort < 1 || primaryPort > 65535) {
		return { ok: false, error: "ZeroTier UDP port must be between 1 and 65535." };
	}

	const socket = dgram.createSocket(isIP(selectedIp) === 6 ? "udp6" : "udp4");
	return await new Promise((resolve) => {
		const timeout = setTimeout(() => {
			socket.close();
			resolve({ ok: false, error: "UDP endpoint check timed out." });
		}, 2000);
		socket.send(Buffer.alloc(0), primaryPort, selectedIp, (error) => {
			clearTimeout(timeout);
			socket.close();
			resolve(error ? { ok: false, error: error.message } : { ok: true });
		});
	});
}

type CheckPanelEndpoint = typeof checkPanelEndpoint;

export async function checkRemoteRootHealth(
	input: RemoteRootHealthInput,
): Promise<RemoteRootHealthResult> {
	try {
		await runRemoteRootCommand(input.connection, REMOTE_ROOT_COMMANDS.test);
		const config = await readRemoteRootConfig(input.connection);
		const configuredSelectedIps = normalizeSelectedIps(
			input.selectedIps,
			input.selectedIp,
		);

		if (!config.identity) {
			return {
				status: "DEGRADED",
				sshStatus: "OK",
				panelStatus: "UNKNOWN",
				identity: null,
				primaryPort: config.primaryPort,
				zerotierVersion: config.zerotierVersion,
				resolvedIps: [],
				selectedIp: input.selectedIp || null,
				selectedIps: configuredSelectedIps,
				endpointCandidates: config.endpointCandidates,
				zerotierInstalled: config.zerotierInstalled,
				serviceStatus: config.serviceStatus,
				startupStatus: config.startupStatus,
				secondaryPort: config.secondaryPort,
				allowSecondaryPort: config.allowSecondaryPort,
				portMappingEnabled: config.portMappingEnabled,
				interfacePrefixBlacklist: config.interfacePrefixBlacklist,
				bindAddresses: config.bindAddresses,
				allowManagementFrom: config.allowManagementFrom,
				defaultBondingPolicy: config.defaultBondingPolicy,
				multithreaded: config.multithreaded,
				linuxKernelMode: config.linuxKernelMode,
				remotePlanetHash: config.remotePlanetHash,
				remoteOfficialPlanetHash: config.remoteOfficialPlanetHash,
				sshError: null,
				panelError: null,
				lastError: "identity.public was not found on the remote root.",
			};
		}

		const baseCandidates = mergeEndpointCandidates([
			...config.endpointCandidates,
			...(isIP(input.connection.host)
				? [
						{
							ip: input.connection.host,
							source: "SSH_HOST" as const,
							port: config.primaryPort,
						},
					]
				: []),
		]);

		if (input.endpointSource === "DOMAIN" && input.domainName) {
			const resolvedIps = await resolveRootDomain(input.domainName);
			const dnsCandidates = resolvedIps.map((ip) => ({
				ip,
				source: "DNS" as const,
				port: config.primaryPort,
			}));
			const endpointCandidates = mergeEndpointCandidates([
				...baseCandidates,
				...dnsCandidates,
			]);
			const selectedIps = configuredSelectedIps.length
				? configuredSelectedIps
				: compact([
						pickDefaultEndpoint(endpointCandidates, ["PUBLIC_IP", "DNS", "SSH_HOST"]),
					]);
			const drift = selectedIps.find(
				(selectedIp) => detectDnsDrift({ selectedIp, resolvedIps }).drifted,
			);
			const panelSummary = drift
				? {
						panelStatus: "DEGRADED" as const,
						panelError: detectDnsDrift({ selectedIp: drift, resolvedIps }).reason,
					}
				: await checkSelectedPanelEndpoints({
						selectedIps,
						primaryPort: config.primaryPort,
						checkPanelEndpoint: input.checkPanelEndpoint || checkPanelEndpoint,
					});
			const serviceError =
				config.serviceStatus === "RUNNING" ? null : "ZeroTier service is not running.";
			const panelError = serviceError || panelSummary.panelError || null;
			return {
				status:
					config.serviceStatus === "RUNNING" && panelSummary.panelStatus === "OK"
						? "HEALTHY"
						: "DEGRADED",
				sshStatus: "OK",
				panelStatus: panelSummary.panelStatus,
				identity: config.identity,
				primaryPort: config.primaryPort,
				zerotierVersion: config.zerotierVersion,
				resolvedIps,
				selectedIp: selectedIps[0] || null,
				selectedIps,
				endpointCandidates,
				zerotierInstalled: config.zerotierInstalled,
				serviceStatus: config.serviceStatus,
				startupStatus: config.startupStatus,
				secondaryPort: config.secondaryPort,
				allowSecondaryPort: config.allowSecondaryPort,
				portMappingEnabled: config.portMappingEnabled,
				interfacePrefixBlacklist: config.interfacePrefixBlacklist,
				bindAddresses: config.bindAddresses,
				allowManagementFrom: config.allowManagementFrom,
				defaultBondingPolicy: config.defaultBondingPolicy,
				multithreaded: config.multithreaded,
				linuxKernelMode: config.linuxKernelMode,
				remotePlanetHash: config.remotePlanetHash,
				remoteOfficialPlanetHash: config.remoteOfficialPlanetHash,
				sshError: null,
				panelError,
				lastError: panelError,
			};
		}

		const selectedIps = configuredSelectedIps.length
			? configuredSelectedIps
			: compact([pickDefaultEndpoint(baseCandidates, ["PUBLIC_IP", "SSH_HOST"])]);
		const panelSummary = await checkSelectedPanelEndpoints({
			selectedIps,
			primaryPort: config.primaryPort,
			checkPanelEndpoint: input.checkPanelEndpoint || checkPanelEndpoint,
		});
		const serviceError =
			config.serviceStatus === "RUNNING" ? null : "ZeroTier service is not running.";
		const panelError = serviceError || panelSummary.panelError || null;

		return {
			status:
				selectedIps.length &&
				config.serviceStatus === "RUNNING" &&
				panelSummary.panelStatus === "OK"
					? "HEALTHY"
					: "DEGRADED",
			sshStatus: "OK",
			panelStatus: panelSummary.panelStatus,
			identity: config.identity,
			primaryPort: config.primaryPort,
			zerotierVersion: config.zerotierVersion,
			resolvedIps: [],
			selectedIp: selectedIps[0] || null,
			selectedIps,
			endpointCandidates: baseCandidates,
			zerotierInstalled: config.zerotierInstalled,
			serviceStatus: config.serviceStatus,
			startupStatus: config.startupStatus,
			secondaryPort: config.secondaryPort,
			allowSecondaryPort: config.allowSecondaryPort,
			portMappingEnabled: config.portMappingEnabled,
			interfacePrefixBlacklist: config.interfacePrefixBlacklist,
			bindAddresses: config.bindAddresses,
			allowManagementFrom: config.allowManagementFrom,
			defaultBondingPolicy: config.defaultBondingPolicy,
			multithreaded: config.multithreaded,
			linuxKernelMode: config.linuxKernelMode,
			remotePlanetHash: config.remotePlanetHash,
			remoteOfficialPlanetHash: config.remoteOfficialPlanetHash,
			sshError: null,
			panelError,
			lastError: panelError,
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : "Remote root check failed.";
		return {
			status: "OFFLINE",
			sshStatus: "FAILED",
			panelStatus: "UNKNOWN",
			identity: null,
			primaryPort: 9993,
			zerotierVersion: null,
			resolvedIps: [],
			selectedIp: input.selectedIp || null,
			selectedIps: normalizeSelectedIps(input.selectedIps, input.selectedIp),
			endpointCandidates: [],
			zerotierInstalled: false,
			serviceStatus: "UNKNOWN",
			startupStatus: "UNKNOWN",
			secondaryPort: null,
			allowSecondaryPort: null,
			portMappingEnabled: null,
			interfacePrefixBlacklist: [],
			bindAddresses: [],
			allowManagementFrom: [],
			defaultBondingPolicy: null,
			multithreaded: null,
			linuxKernelMode: null,
			remotePlanetHash: null,
			remoteOfficialPlanetHash: null,
			sshError: message,
			panelError: null,
			lastError: message,
		};
	}
}

function mergeEndpointCandidates(
	candidates: RemoteRootEndpointCandidate[],
): RemoteRootEndpointCandidate[] {
	const seen = new Set<string>();
	const result: RemoteRootEndpointCandidate[] = [];
	for (const candidate of candidates) {
		const key = `${candidate.source}:${candidate.ip}:${candidate.port}`;
		if (!seen.has(key)) {
			seen.add(key);
			result.push(candidate);
		}
	}
	return result;
}

function pickDefaultEndpoint(
	candidates: RemoteRootEndpointCandidate[],
	preferredSources: RemoteRootEndpointCandidate["source"][],
): string | null {
	for (const source of preferredSources) {
		const matches = candidates.filter((candidate) => candidate.source === source);
		if (matches.length === 1) return matches[0].ip;
	}
	return null;
}

async function checkSelectedPanelEndpoints({
	selectedIps,
	primaryPort,
	checkPanelEndpoint,
}: {
	selectedIps: string[];
	primaryPort: number;
	checkPanelEndpoint: CheckPanelEndpoint;
}): Promise<PanelEndpointSummary> {
	if (!selectedIps.length) {
		return {
			panelStatus: "FAILED",
			panelError: "No selected endpoint IP is configured.",
		};
	}

	const results = await Promise.all(
		selectedIps.map(async (selectedIp) => ({
			selectedIp,
			result: await checkPanelEndpoint({ selectedIp, primaryPort }),
		})),
	);
	const failures = results.filter(({ result }) => !result.ok);
	if (!failures.length) {
		return { panelStatus: "OK", panelError: null };
	}
	const error = failures
		.map(
			({ selectedIp, result }) => `${selectedIp}: ${result.error || "Endpoint failed."}`,
		)
		.join("; ");
	return {
		panelStatus: failures.length === results.length ? "FAILED" : "DEGRADED",
		panelError: error,
	};
}

function normalizeSelectedIps(
	selectedIps: unknown,
	legacySelectedIp?: string | null,
): string[] {
	const values = Array.isArray(selectedIps)
		? selectedIps
		: legacySelectedIp
			? [legacySelectedIp]
			: [];
	return Array.from(
		new Set(
			values
				.filter((item): item is string => typeof item === "string")
				.map((item) => item.trim())
				.filter(Boolean),
		),
	);
}

function compact(values: Array<string | null | undefined>): string[] {
	return values.filter((value): value is string => Boolean(value));
}
