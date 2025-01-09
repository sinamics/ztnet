// hooks/useNetworkUpdates.ts
import { useEffect } from "react";
import { useWebSocket } from "next-ws/client";
import { useNetworkStore } from "~/store/networkStore";

export function useNetworkUpdates(networkId: string) {
	const ws = useWebSocket();
	const updateNetworkData = useNetworkStore((state) => state.updateNetworkData);

	useEffect(() => {
		if (!ws || !networkId) return;

		// check if ws is in connected state
		if (ws.readyState !== ws.OPEN) {
			console.error("Websocket is not connected");
			return;
		}
		// Watch this network
		ws?.send(
			JSON.stringify({
				type: "watch_network",
				networkId,
			}),
		);

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
			// Stop watching this network when component unmounts
			ws?.send(
				JSON.stringify({
					type: "unwatch_network",
					networkId,
				}),
			);
			ws.removeEventListener("message", handleMessage);
		};
	}, [ws, networkId, updateNetworkData]);
}
