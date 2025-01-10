// app/api/ws/route.ts
import type { WebSocket, WebSocketServer } from "ws";
import type { IncomingMessage } from "node:http";
import { parse } from "cookie";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { WebSocketManager } from "~/lib/websocketMangager";

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
		// Authentication check
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
		const wsManager = WebSocketManager.getInstance();
		const wsClient = wsManager.addClient(userId, client);

		client.on("message", async (rawMessage) => {
			try {
				const message = JSON.parse(rawMessage.toString());

				switch (message.type) {
					case "watch_network": {
						await wsManager.watchNetwork(wsClient, message.networkId);
						break;
					}

					case "unwatch_network": {
						wsManager.unwatchNetwork(wsClient, message.networkId);
						break;
					}

					default: {
						console.warn("Unknown message type:", message.type);
						client.send(
							JSON.stringify({
								type: "error",
								message: "Unknown message type",
							}),
						);
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
	} catch (error) {
		console.error("WebSocket connection error:", error);
		client.close(1011, "Internal Server Error");
	}
}

// Cleanup on module reload (development)
// if (process.env.NODE_ENV === "development") {
// 	WebSocketManager.getInstance().cleanup();
// }
