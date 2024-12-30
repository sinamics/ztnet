// https://github.com/burakorkmez/fullstack-chat-app
// socket-server.ts
import { Server } from "socket.io";
import http from "http";
import express from "express";
import * as ztController from "../src/utils/ztApi";
import { auth } from "../src/server/auth";
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
	cors: {
		origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
		methods: ["GET", "POST"],
	},
});

// Server-side session verification
export async function verifySocketSession(token: string): Promise<Session | null> {
	try {
		const session = await auth();
		return session;
	} catch (error) {
		console.error("Socket auth error:", error);
		return null;
	}
}

// Track connected users and their subscribed networks
const userNetworks = new Map<string, Set<string>>();

io.on("connection", (socket) => {
	// biome-ignore lint/suspicious/noConsoleLog: <explanation>
	console.log(`🔗 User connected: ${socket.id}`);
	userNetworks.set(socket.id, new Set());

	socket.on("join-network", async (networkId: string) => {
		const userSubs = userNetworks.get(socket.id);
		if (userSubs) {
			userSubs.add(networkId);
			socket.join(networkId);
			// biome-ignore lint/suspicious/noConsoleLog: <explanation>
			console.log(`User ${socket.id} joined network ${networkId}`);

			// Send initial network state
			try {
				const networkDetails = await ztController.local_network_detail(networkId);
				socket.emit("network-update", networkDetails);
			} catch (error) {
				console.error(`Failed to fetch network details for ${networkId}:`, error);
			}
		}
	});

	socket.on("leave-network", (networkId: string) => {
		const userSubs = userNetworks.get(socket.id);
		if (userSubs) {
			userSubs.delete(networkId);
			socket.leave(networkId);
			// biome-ignore lint/suspicious/noConsoleLog: <explanation>
			console.log(`User ${socket.id} left network ${networkId}`);
		}
	});

	socket.on("disconnect", () => {
		userNetworks.delete(socket.id);
		// biome-ignore lint/suspicious/noConsoleLog: <explanation>
		console.log(`❌ User disconnected: ${socket.id}`);
	});
});

// Set up periodic network updates
const UPDATE_INTERVAL = 10000; // 10 seconds

async function broadcastNetworkUpdates() {
	// Get all unique network IDs being watched
	const activeNetworks = new Set<string>();
	for (const networks of userNetworks.values()) {
		for (const networkId of networks) {
			activeNetworks.add(networkId);
		}
	}

	// Update each active network
	for (const networkId of activeNetworks) {
		try {
			const networkDetails = await ztController.local_network_detail(networkId, false);
			io.to(networkId).emit("network-update", networkDetails);
		} catch (error) {
			console.error(`Failed to update network ${networkId}:`, error);
		}
	}
}

setInterval(broadcastNetworkUpdates, UPDATE_INTERVAL);

const PORT = process.env.SOCKET_PORT || 4000;
server.listen(PORT, () => {
	// biome-ignore lint/suspicious/noConsoleLog: <explanation>
	console.log(`🚀 Socket.IO server running at http://localhost:${PORT}`);
});
