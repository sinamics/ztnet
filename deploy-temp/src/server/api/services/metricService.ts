import { UserContext } from "~/types/ctx";
import { get_controller_metrics } from "~/utils/ztApi";

/*
 * NOT IN USE. Added for testing purposes.
 *
 */

export async function getNetworkMetrics(ctx: UserContext, memberIds: string[]) {
	const rawMetrics = await get_controller_metrics({ ctx });
	const lines = rawMetrics.split("\n");
	const networkMetrics = {
		packetCounts: {},
		latency: {},
		pathCounts: {},
	};

	const memberIdSet = new Set(memberIds);

	for (const line of lines) {
		const nodeIdMatch = line.match(/node_id="(\w+)"/);
		if (!nodeIdMatch) continue;
		const nodeId = nodeIdMatch[1];

		if (!memberIdSet.has(nodeId)) continue;

		if (line.startsWith("zt_peer_packets")) {
			const match = line.match(/direction="(\w+)".+\s(\d+)$/);
			if (match) {
				const [, direction, count] = match;
				if (!networkMetrics.packetCounts[nodeId])
					networkMetrics.packetCounts[nodeId] = {};
				networkMetrics.packetCounts[nodeId][direction] = parseInt(count);
			}
		} else if (line.startsWith("zt_peer_latency_sum")) {
			const match = line.match(/\s(\d+)$/);
			if (match) {
				const [, sum] = match;
				if (!networkMetrics.latency[nodeId]) networkMetrics.latency[nodeId] = {};
				networkMetrics.latency[nodeId].sum = BigInt(sum);
			}
		} else if (line.startsWith("zt_peer_latency_count")) {
			const match = line.match(/\s(\d+)$/);
			if (match) {
				const [, count] = match;
				if (!networkMetrics.latency[nodeId]) networkMetrics.latency[nodeId] = {};
				networkMetrics.latency[nodeId].count = parseInt(count);
			}
		} else if (line.startsWith("zt_peer_path_count")) {
			const match = line.match(/status="(\w+)".+\s(\d+)$/);
			if (match) {
				const [, status, count] = match;
				if (!networkMetrics.pathCounts[nodeId]) networkMetrics.pathCounts[nodeId] = {};
				networkMetrics.pathCounts[nodeId][status] = parseInt(count);
			}
		}
	}

	// Calculate totals and averages
	for (const nodeId in networkMetrics.packetCounts) {
		const packets = networkMetrics.packetCounts[nodeId];
		packets.total = (packets.tx || 0) + (packets.rx || 0);
	}

	for (const nodeId in networkMetrics.latency) {
		const latency = networkMetrics.latency[nodeId];
		if (latency.sum !== undefined && latency.count !== undefined) {
			latency.average = Number(
				(latency.sum * BigInt(1000)) / BigInt(latency.count) / BigInt(1000),
			);
			latency.sum = Number(latency.sum);
		}
	}

	for (const nodeId in networkMetrics.latency) {
		const latency = networkMetrics.latency[nodeId];
		if (latency.sum !== undefined && latency.count !== undefined) {
			// Assuming sum is in microseconds
			const avgUs = latency.sum / latency.count;
			latency.averageMs = Number((avgUs / 1000).toFixed(2));
			latency.sumMs = Number((latency.sum / 1000).toFixed(2));
		}
	}

	return networkMetrics;
}
