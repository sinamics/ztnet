import dns from "node:dns/promises";

export const normalizeResolvedIps = (ips: string[]): string[] => {
	return Array.from(new Set(ips.filter(Boolean))).sort((a, b) => a.localeCompare(b));
};

export async function resolveRootDomain(domainName: string): Promise<string[]> {
	const domain = domainName.trim();
	if (!domain) return [];

	const [v4, v6] = await Promise.allSettled([dns.resolve4(domain), dns.resolve6(domain)]);

	const ips = [
		...(v4.status === "fulfilled" ? v4.value : []),
		...(v6.status === "fulfilled" ? v6.value : []),
	];

	return normalizeResolvedIps(ips);
}

export function detectDnsDrift({
	selectedIp,
	resolvedIps,
}: {
	selectedIp?: string | null;
	resolvedIps: string[];
}): { drifted: boolean; reason: string | null } {
	if (!selectedIp) {
		return { drifted: true, reason: "No selected IP is configured." };
	}

	if (resolvedIps.includes(selectedIp)) {
		return { drifted: false, reason: null };
	}

	return {
		drifted: true,
		reason: "Selected IP is no longer present in DNS answers.",
	};
}
