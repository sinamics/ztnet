// lib/services/NetworkSyncService.ts
import { NetworkStateCache } from "~/lib/networkCache";
import { getNetworkInfo } from "~/features/network/server/actions/getNetworkById";
import { runWithWebSocketAuth } from "~/lib/authContext";
import type { NetworkAndMemberResponse } from "~/types/network";
import { getNetworkMembers } from "~/features/network/server/actions/getNetworkMembers";

interface NetworkUpdate {
	networkId: string;
	data: NetworkAndMemberResponse;
	timestamp: number;
}

export class NetworkSyncService {
	private static instance: NetworkSyncService;
	private readonly networkCache: NetworkStateCache;

	private constructor() {
		this.networkCache = NetworkStateCache.getInstance();
	}

	public static getInstance(): NetworkSyncService {
		if (!NetworkSyncService.instance) {
			NetworkSyncService.instance = new NetworkSyncService();
		}
		return NetworkSyncService.instance;
	}

	public async syncNetwork(
		networkId: string,
		userId: string,
		isCentral = false,
	): Promise<NetworkUpdate> {
		try {
			const [networkInfo, networkMembers] = await Promise.all([
				runWithWebSocketAuth(userId, () =>
					getNetworkInfo({
						nwid: networkId,
						central: isCentral,
					}),
				),
				runWithWebSocketAuth(userId, () =>
					getNetworkMembers({
						nwid: networkId,
						central: isCentral,
					}),
				),
			]);

			const networkData = {
				network: networkInfo.network,
				members: networkMembers.members,
				zombieMembers: networkMembers.zombieMembers,
			};

			// Update cache if network state has changed
			if (this.networkCache.hasChanged(networkId, networkData)) {
				this.networkCache.updateCache(networkId, networkData);
			}

			return {
				networkId,
				data: networkData,
				timestamp: this.networkCache.getLastUpdateTime(networkId),
			};
		} catch (error) {
			console.error(`Error syncing network ${networkId}:`, error);
			throw error;
		}
	}

	public clearNetworkCache(networkId: string): void {
		this.networkCache.clearCache(networkId);
	}
}
