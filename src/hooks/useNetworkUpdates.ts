// hooks/useNetworkUpdates.ts
import { useEffect, useCallback } from "react";
import { useWebSocket } from "next-ws/client";
import {
	useNetworkStore,
	NetworkSection,
	type SectionTypeMap,
} from "~/store/networkStore";

export function useNetworkUpdates(networkId: string) {
	const ws = useWebSocket();
	const updateMultipleSections = useNetworkStore((state) => state.updateMultipleSections);
	const setMembers = useNetworkStore((state) => state.setMembers);

	const handleNetworkUpdate = useCallback(
		(data: any) => {
			const { network, members } = data;

			const updates: Partial<{
				[K in NetworkSection]?: Partial<SectionTypeMap[K]>;
			}> = {};

			// Check and update basicInfo section
			const basicInfoUpdates: Partial<SectionTypeMap[NetworkSection.BASIC_INFO]> = {
				id: network.id,
				nwid: network.nwid,
				name: network.name,
				description: network.description,
				private: network.private,
				objtype: network.objtype,
				creationTime: network.creationTime,
				revision: network.revision,
			};

			if (Object.values(basicInfoUpdates).some((v) => v !== undefined)) {
				updates[NetworkSection.BASIC_INFO] = basicInfoUpdates;
			}

			// Check and update config section
			const configUpdates: Partial<SectionTypeMap[NetworkSection.CONFIG]> = {
				mtu: network.mtu,
				multicastLimit: network.multicastLimit,
				enableBroadcast: network.enableBroadcast,
				ipAssignmentPools: network.ipAssignmentPools,
				routes: network.routes,
				dns: network.dns,
				rules: network.rules,
				rulesSource: network.rulesSource,
				flowRule: network.flowRule,
				autoAssignIp: network.autoAssignIp,
				v4AssignMode: network.v4AssignMode,
				v6AssignMode: network.v6AssignMode,
			};

			if (Object.values(configUpdates).some((v) => v !== undefined)) {
				updates[NetworkSection.CONFIG] = configUpdates;
			}

			// Check and update security section
			const securityUpdates: Partial<SectionTypeMap[NetworkSection.SECURITY]> = {
				authTokens: network.authTokens,
				authorizationEndpoint: network.authorizationEndpoint,
				capabilities: network.capabilities,
				clientId: network.clientId,
				ssoEnabled: network.ssoEnabled,
				tags: network.tags,
				tagsByName: network.tagsByName,
				capabilitiesByName: network.capabilitiesByName,
				remoteTraceLevel: network.remoteTraceLevel,
				remoteTraceTarget: network.remoteTraceTarget,
			};

			if (Object.values(securityUpdates).some((v) => v !== undefined)) {
				updates[NetworkSection.SECURITY] = securityUpdates;
			}

			// Update store if we have any changes
			if (Object.keys(updates).length > 0) {
				updateMultipleSections(updates);
			}

			// Update members if they've changed
			if (members) {
				setMembers(members);
			}
		},
		[updateMultipleSections, setMembers],
	);

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
		} catch (error) {
			console.error("Error sending unwatch request:", error);
		}
	}, [ws, networkId]);

	// Handle WebSocket connection state changes
	useEffect(() => {
		if (!ws) return;

		const handleOpen = () => {
			watchNetwork();
		};

		const handleClose = () => {
			console.log("WebSocket disconnected");
		};

		const handleError = (error: Event) => {
			console.error("WebSocket error:", error);
		};

		// Handle messages
		const handleMessage = (event: MessageEvent) => {
			try {
				const data = JSON.parse(event.data);

				switch (data.type) {
					case "network_update":
						handleNetworkUpdate(data.data);
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

		// Add all event listeners
		ws.addEventListener("open", handleOpen);
		ws.addEventListener("close", handleClose);
		ws.addEventListener("error", handleError);
		ws.addEventListener("message", handleMessage);

		// If the WebSocket is already open, start watching
		if (ws.readyState === WebSocket.OPEN) {
			watchNetwork();
		}

		// Cleanup function
		return () => {
			ws.removeEventListener("open", handleOpen);
			ws.removeEventListener("close", handleClose);
			ws.removeEventListener("error", handleError);
			ws.removeEventListener("message", handleMessage);

			// Unwatch if connected
			if (ws.readyState === WebSocket.OPEN) {
				unwatchNetwork();
			}
		};
	}, [ws, watchNetwork, unwatchNetwork, handleNetworkUpdate]);

	// Return connection status for component usage
	return {
		isConnected: ws?.readyState === WebSocket.OPEN,
		connectionState: ws?.readyState,
	};
}
