// hooks/useNetworkUpdates.ts
import { useEffect, useCallback } from "react";
import { useWebSocket } from "next-ws/client";
import { useNetworkStore } from "~/store/networkStore";

export function useNetworkUpdates(networkId: string) {
	const ws = useWebSocket();
	const updateNetworkData = useNetworkStore((state) => state.updateNetworkData);

	// Separate the watch/unwatch logic into reusable functions
	const watchNetwork = useCallback(() => {
		if (!ws || !networkId) return;

		try {
			ws.send(
				JSON.stringify({
					type: "watch_network",
					networkId,
				}),
			);
			// console.log(`Started watching network: ${networkId}`);
		} catch (error) {
			console.error("Error sending watch request:", error);
		}
	}, [ws, networkId]);

	const unwatchNetwork = useCallback(() => {
		if (!ws || !networkId) return;

		try {
			ws.send(
				JSON.stringify({
					type: "unwatch_network",
					networkId,
				}),
			);
			// biome-ignore lint/suspicious/noConsoleLog: <explanation>
			console.log(`Stopped watching network: ${networkId}`);
		} catch (error) {
			console.error("Error sending unwatch request:", error);
		}
	}, [ws, networkId]);

	// Handle WebSocket connection state changes
	useEffect(() => {
		if (!ws) return;

		const handleOpen = () => {
			// biome-ignore lint/suspicious/noConsoleLog: <explanation>
			console.log("WebSocket connected");
			watchNetwork();
		};

		const handleClose = () => {
			// biome-ignore lint/suspicious/noConsoleLog: <explanation>
			console.log("WebSocket disconnected");
		};

		const handleError = (error: Event) => {
			console.error("WebSocket error:", error);
		};

		// Add connection state listeners
		ws.addEventListener("open", handleOpen);
		ws.addEventListener("close", handleClose);
		ws.addEventListener("error", handleError);

		// If the WebSocket is already open, start watching
		if (ws.readyState === WebSocket.OPEN) {
			watchNetwork();
		}

		return () => {
			// Clean up listeners
			ws.removeEventListener("open", handleOpen);
			ws.removeEventListener("close", handleClose);
			ws.removeEventListener("error", handleError);

			// Unwatch if connected
			if (ws.readyState === WebSocket.OPEN) {
				unwatchNetwork();
			}
		};
	}, [ws, watchNetwork, unwatchNetwork]);

	// Handle messages
	useEffect(() => {
		if (!ws) return;

		const handleMessage = (event: MessageEvent) => {
			try {
				const data = JSON.parse(event.data);

				switch (data.type) {
					case "network_update":
						console.log("Received network update:", data.data);
						updateNetworkData({
							network: data.data.network,
							members: data.data.members,
							zombieMembers: data.data.zombieMembers,
						});
						break;
					case "error":
						console.error("WebSocket error:", data.message);
						break;
					default:
						console.warn("Unknown message type:", data.type);
				}
			} catch (error) {
				console.error("Error processing WebSocket message:", error);
			}
		};

		ws.addEventListener("message", handleMessage);

		return () => {
			ws.removeEventListener("message", handleMessage);
		};
	}, [ws, updateNetworkData]);

	// Return connection status for component usage
	return {
		isConnected: ws?.readyState === WebSocket.OPEN,
		connectionState: ws?.readyState,
	};
}
