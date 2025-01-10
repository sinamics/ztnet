// lib/websocket/WebSocketManager.ts
import type { WebSocket } from "ws";
import { NetworkStateCache } from "~/lib/networkCache";
import { getNetworkById } from "~/features/network/server/actions/getNetworkById";
import { runWithWebSocketAuth } from "~/lib/authContext";
import { NetworkSyncService } from "./networkSyncService";
import type { NetworkAndMemberResponse } from "~/types/network";

interface WebSocketClient {
	socket: WebSocket;
	userId: string;
	networks: Set<string>;
	lastActivity: number;
}

// Extend global namespace to declare a global variable due to nextjs HMR
declare global {
	var wsManager: WebSocketManager | undefined;
}

interface NetworkUpdate {
	networkId: string;
	data: NetworkAndMemberResponse;
	timestamp: number;
}

export class WebSocketManager {
	private instanceId: string;
	private static instance: WebSocketManager;
	private readonly syncService: NetworkSyncService;
	private clients: Map<string, Set<WebSocketClient>> = new Map();
	private networkSubscriptions: Map<string, Set<string>> = new Map();
	private updateInterval: NodeJS.Timeout | null = null;
	private readonly networkCache: NetworkStateCache;
	private readonly INACTIVE_TIMEOUT = 300000; // 5 minutes
	private readonly UPDATE_INTERVAL = 10000; // 10 seconds

	private constructor() {
		this.instanceId = Math.random().toString(36).substring(7);
		this.networkCache = NetworkStateCache.getInstance();
		this.syncService = NetworkSyncService.getInstance();
		this.startUpdateLoop();
	}

	public static getInstance(): WebSocketManager {
		if (!global.wsManager) {
			global.wsManager = new WebSocketManager();
		}
		return global.wsManager;
	}

	private startUpdateLoop() {
		if (this.updateInterval) return;

		this.updateInterval = setInterval(async () => {
			await this.checkNetworkUpdates();
			this.cleanupInactiveConnections();
		}, this.UPDATE_INTERVAL);
	}

	private async checkNetworkUpdates() {
		const processedNetworks = new Set<string>();

		for (const [networkId, subscribers] of this.networkSubscriptions.entries()) {
			if (processedNetworks.has(networkId) || subscribers.size === 0) continue;

			try {
				const userId = Array.from(subscribers)[0];
				const networkUpdate = await this.syncService.syncNetwork(networkId, userId);

				if (this.networkCache.hasChanged(networkId, networkUpdate.data)) {
					await this.broadcastNetworkUpdate(networkId, networkUpdate);
				}

				processedNetworks.add(networkId);
			} catch (error) {
				console.error(`Error updating network ${networkId}:`, error);
			}
		}
	}

	private async broadcastNetworkUpdate(networkId: string, update: NetworkUpdate) {
		const subscribers = this.networkSubscriptions.get(networkId);
		if (!subscribers) return;

		const message = JSON.stringify({
			type: "network_update",
			data: update.data,
			timestamp: update.timestamp,
		});

		for (const userId of subscribers) {
			const userClients = this.clients.get(userId);
			if (!userClients) continue;

			for (const client of userClients) {
				if (client.networks.has(networkId)) {
					try {
						client.socket.send(message);
						client.lastActivity = Date.now();
					} catch (error) {
						console.error("Error sending to client:", error);
						this.removeClient(userId, client);
					}
				}
			}
		}
	}

	private cleanupInactiveConnections() {
		const now = Date.now();
		for (const [userId, clients] of this.clients.entries()) {
			for (const client of clients) {
				if (now - client.lastActivity > this.INACTIVE_TIMEOUT) {
					this.removeClient(userId, client);
				}
			}
		}
	}
	public async notifyNetworkUpdate(networkId: string) {
		try {
			const subscribers = this.networkSubscriptions.get(networkId);

			if (!subscribers || subscribers.size === 0) {
				return;
			}

			const userId = Array.from(subscribers)[0];
			const networkUpdate = await this.syncService.syncNetwork(networkId, userId);

			// Broadcast the update to all subscribers
			await this.broadcastNetworkUpdate(networkId, networkUpdate);
		} catch (error) {
			console.error(`Error notifying network update for ${networkId}:`, error);
		}
	}
	public addClient(userId: string, socket: WebSocket): WebSocketClient {
		const client: WebSocketClient = {
			socket,
			userId,
			networks: new Set(),
			lastActivity: Date.now(),
		};

		if (!this.clients.has(userId)) {
			this.clients.set(userId, new Set());
		}
		this.clients.get(userId)!.add(client);

		return client;
	}

	private removeClient(userId: string, client: WebSocketClient) {
		// Remove from network subscriptions
		for (const networkId of client.networks) {
			const subscribers = this.networkSubscriptions.get(networkId);
			if (subscribers) {
				if (this.getNetworkSubscriberCount(networkId, userId) <= 1) {
					subscribers.delete(userId);
					if (subscribers.size === 0) {
						this.networkSubscriptions.delete(networkId);
						this.networkCache.clearCache(networkId);
					}
				}
			}
		}

		// Remove from clients
		const userClients = this.clients.get(userId);
		if (userClients) {
			userClients.delete(client);
			if (userClients.size === 0) {
				this.clients.delete(userId);
			}
		}

		try {
			client.socket.close();
		} catch (error) {
			console.error("Error closing socket:", error);
		}
	}

	private getNetworkSubscriberCount(networkId: string, userId: string): number {
		let count = 0;
		const userClients = this.clients.get(userId);
		if (userClients) {
			for (const client of userClients) {
				if (client.networks.has(networkId)) count++;
			}
		}
		return count;
	}

	public async watchNetwork(client: WebSocketClient, networkId: string) {
		try {
			client.networks.add(networkId);
			client.lastActivity = Date.now();

			if (!this.networkSubscriptions.has(networkId)) {
				this.networkSubscriptions.set(networkId, new Set());
			}
			this.networkSubscriptions.get(networkId)!.add(client.userId);

			// Send initial data using sync service
			const networkUpdate = await this.syncService.syncNetwork(networkId, client.userId);

			client.socket.send(
				JSON.stringify({
					type: "network_update",
					data: networkUpdate.data,
					timestamp: networkUpdate.timestamp,
				}),
			);
		} catch (error) {
			console.error(`Error watching network ${networkId}:`, error);
			client.socket.send(
				JSON.stringify({
					type: "error",
					message: "Failed to watch network",
				}),
			);
		}
	}

	public unwatchNetwork(client: WebSocketClient, networkId: string) {
		client.networks.delete(networkId);
		client.lastActivity = Date.now();

		if (this.getNetworkSubscriberCount(networkId, client.userId) <= 1) {
			const subscribers = this.networkSubscriptions.get(networkId);
			if (subscribers) {
				subscribers.delete(client.userId);
				if (subscribers.size === 0) {
					this.networkSubscriptions.delete(networkId);
					this.syncService.clearNetworkCache(networkId);
				}
			}
		}
	}

	public cleanup() {
		if (this.updateInterval) {
			clearInterval(this.updateInterval);
			this.updateInterval = null;
		}

		for (const [userId, clients] of this.clients.entries()) {
			for (const client of clients) {
				this.removeClient(userId, client);
			}
		}

		this.clients.clear();
		this.networkSubscriptions.clear();
	}
}
