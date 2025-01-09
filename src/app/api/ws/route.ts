// app/api/ws/route.ts
import { NetworkStateCache } from "~/lib/networkCache";
import { getNetworkById } from "~/features/network/server/actions/getNetworkById";
import type { WebSocket, WebSocketServer } from "ws";
import type { IncomingMessage } from "http";
import { parse } from "cookie";
import { getToken } from "next-auth/jwt";
import { runWithWebSocketAuth } from "~/lib/authContext";
import { NextRequest } from "next/server";

const clientNetworks = new Map<WebSocket, Set<string>>();
const networkWatchers = new Map<string, number>();

async function checkNetworkUpdates(userId: string) {
	const networkCache = NetworkStateCache.getInstance();

	for (const [networkId, watcherCount] of networkWatchers.entries()) {
		if (watcherCount > 0) {
			try {
				const networkData = await runWithWebSocketAuth(userId, () =>
					getNetworkById({
						nwid: networkId,
						central: false,
					}),
				);
				// Only broadcast if there are meaningful changes
				// if (networkCache.hasChanged(networkId, networkData)) {
				networkCache.updateCache(networkId, networkData);

				// Broadcast to all clients watching this network
				for (const [client, networks] of clientNetworks.entries()) {
					if (networks.has(networkId)) {
						client.send(
							JSON.stringify({
								type: "network_update",
								data: networkData,
								timestamp: networkCache.getLastUpdateTime(networkId),
							}),
						);
					}
				}
				// }
			} catch (error) {
				console.error(`Error updating network ${networkId}:`, error);
			}
		}
	}
}

export function GET() {
	const headers = new Headers();
	headers.set("Connection", "Upgrade");
	headers.set("Upgrade", "websocket");
	return new Response("Upgrade Required", { status: 426, headers });
}

export async function SOCKET(
	client: WebSocket,
	request: NextRequest & IncomingMessage,
	_server: WebSocketServer,
) {
	try {
		if (!request.headers.cookie) {
			client.close(1000, "Unauthorized");
			return;
		}

		const cookies = parse(request.headers.cookie);
		const sessionToken = cookies["authjs.session-token"];

		if (!sessionToken) {
			client.close(1000, "Unauthorized");
			return;
		}

		const token = await getToken({
			req: request,
			secret: process.env.AUTH_SECRET,
		});

		if (!token) {
			console.error("Invalid token");
			client.close(1000, "Unauthorized");
			return;
		}

		const userId = token.sub!;
		const networkCache = NetworkStateCache.getInstance();
		clientNetworks.set(client, new Set());

		client.on("message", async (rawMessage) => {
			try {
				const message = JSON.parse(rawMessage.toString());

				switch (message.type) {
					case "watch_network": {
						const networkId = message.networkId;
						const clientSubs = clientNetworks.get(client);

						if (clientSubs && !clientSubs.has(networkId)) {
							clientSubs.add(networkId);
							networkWatchers.set(networkId, (networkWatchers.get(networkId) || 0) + 1);

							try {
								const networkData = await runWithWebSocketAuth(userId, () =>
									getNetworkById({
										nwid: networkId,
										central: false,
									}),
								);
								// Always send initial data
								networkCache.updateCache(networkId, networkData);
								client.send(
									JSON.stringify({
										type: "network_update",
										data: networkData,
										timestamp: networkCache.getLastUpdateTime(networkId),
									}),
								);
							} catch (error) {
								console.error(`Error fetching network ${networkId}:`, error);
								client.send(
									JSON.stringify({
										type: "error",
										message: "Failed to fetch network data",
									}),
								);
							}
						}
						break;
					}

					case "unwatch_network": {
						const networkId = message.networkId;
						const clientSubs = clientNetworks.get(client);

						if (clientSubs?.has(networkId)) {
							clientSubs.delete(networkId);
							const count = networkWatchers.get(networkId) || 0;
							if (count > 1) {
								networkWatchers.set(networkId, count - 1);
							} else {
								networkWatchers.delete(networkId);
								// Clear cache when no one is watching
								networkCache.clearCache(networkId);
							}
						}
						break;
					}
				}
			} catch (error) {
				console.error("Error processing message:", error);
				client.send(
					JSON.stringify({
						type: "error",
						message: "Failed to process message",
					}),
				);
			}
		});

		client.on("close", () => {
			const subs = clientNetworks.get(client);
			if (subs) {
				for (const networkId of subs) {
					const count = networkWatchers.get(networkId) || 0;
					if (count > 1) {
						networkWatchers.set(networkId, count - 1);
					} else {
						networkWatchers.delete(networkId);
						networkCache.clearCache(networkId);
					}
				}
			}
			clientNetworks.delete(client);
		});

		const updateInterval = setInterval(() => checkNetworkUpdates(userId), 10000);

		client.on("close", () => {
			clearInterval(updateInterval);
		});
	} catch (error) {
		console.error("WebSocket connection error:", error);
		client.close(1011, "Internal Server Error");
	}
}
