type RemoteRootLogNode = {
	primaryPort?: number | null;
	zerotierVersion?: string | null;
	serviceStatus?: string | null;
	startupStatus?: string | null;
	selectedIp?: string | null;
	identity?: string | null;
};

const normalizeWord = (value?: string | null) =>
	value ? value.toLowerCase().replace(/_/g, " ") : "unknown";

export function remoteRootNodeId(identity?: string | null): string | null {
	return identity?.split(":")[0]?.trim() || null;
}

export function buildRemoteRootReadLogs({
	prefix,
	node,
}: {
	prefix: string;
	node: RemoteRootLogNode;
}): string[] {
	const version = node.zerotierVersion || "unknown";
	const service = normalizeWord(node.serviceStatus);
	const startup = normalizeWord(node.startupStatus);
	const logs = [
		prefix,
		`Read ZeroTier ${version}, service ${service}, startup ${startup}.`,
		`Detected UDP port ${node.primaryPort || 9993}.`,
		node.selectedIp
			? `Selected endpoint ${node.selectedIp}.`
			: "Selected endpoint is not configured.",
	];
	const nodeId = remoteRootNodeId(node.identity);
	if (nodeId) logs.push(`Node ID ${nodeId}.`);
	return logs;
}

export function formatRemoteRootTaskLogLine(line: string): string {
	const trimmed = line.trim();
	if (!trimmed.startsWith("{")) return line;

	try {
		const parsed = JSON.parse(trimmed) as RemoteRootLogNode;
		const version = parsed.zerotierVersion || "unknown";
		const service = normalizeWord(parsed.serviceStatus);
		const startup = normalizeWord(parsed.startupStatus);
		const port = parsed.primaryPort || 9993;
		return `Read ZeroTier ${version}, service ${service}, startup ${startup}. UDP port ${port}.`;
	} catch {
		return line;
	}
}
