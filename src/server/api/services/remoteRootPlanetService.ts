import { isIP } from "node:net";

export type RemoteRootPlanetInput = {
	name: string;
	identity?: string | null;
	selectedIp?: string | null;
	selectedIps?: unknown;
	primaryPort?: number | null;
	domainName?: string | null;
};

export type PlanetRootEntry = {
	comments: string;
	identity: string;
	endpoints: string[];
};

export function normalizePlanetRootNodes(nodes: PlanetRootEntry[]): PlanetRootEntry[] {
	if (!nodes.length) {
		throw new Error("At least one root node is required.");
	}

	return nodes.map((node) => {
		const identity = node.identity?.trim();
		if (!identity) {
			throw new Error("Root node identity is required.");
		}

		const endpoints = Array.isArray(node.endpoints)
			? node.endpoints.map((endpoint) => endpoint.trim()).filter(Boolean)
			: [];
		if (!endpoints.length) {
			throw new Error("Root node endpoint is required.");
		}

		return {
			comments: node.comments || "ztnet.network",
			identity,
			endpoints,
		};
	});
}

export function buildRemoteRootPlanetEntry(node: RemoteRootPlanetInput): PlanetRootEntry {
	const identity = node.identity?.trim();
	if (!identity) {
		throw new Error("Remote root identity is required.");
	}

	const selectedIps = normalizeSelectedIps(node.selectedIps, node.selectedIp);
	if (!selectedIps.length) {
		throw new Error("Remote root selected IP is required.");
	}

	for (const selectedIp of selectedIps) {
		if (!isIP(selectedIp)) {
			throw new Error("Remote root selected IP must be an IPv4 or IPv6 address.");
		}
	}

	const port = node.primaryPort || 9993;
	if (!Number.isInteger(port) || port < 1 || port > 65535) {
		throw new Error("Remote root port must be between 1 and 65535.");
	}

	return {
		comments: node.name || "remote-root",
		identity,
		endpoints: selectedIps.map((selectedIp) => `${selectedIp}/${port}`),
	};
}

export function normalizeSelectedIps(
	selectedIps: unknown,
	legacySelectedIp?: string | null,
): string[] {
	const listValues = Array.isArray(selectedIps) ? selectedIps : [];
	const values = listValues.length
		? listValues
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
