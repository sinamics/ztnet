import { useEffect } from "react";
import { create } from "zustand";
import { io } from "socket.io-client";
import { api } from "~/utils/api";
import { networkMembersChannel } from "~/utils/socketChannels";

/**
 * Shared connection state for the per-network live socket. One socket is opened
 * (by the member table via useNetworkMembersSocket); the page and the table both
 * read `connected` from here to drive an adaptive refetch fallback — slow while
 * the socket is delivering live pushes, faster when it isn't (e.g. behind a proxy
 * that doesn't forward WebSockets).
 */
interface NetworkSocketState {
	connected: boolean;
	setConnected: (connected: boolean) => void;
}

export const useNetworkSocketStore = create<NetworkSocketState>((set) => ({
	connected: false,
	setConnected: (connected) => set({ connected }),
}));

/**
 * Opens a single Socket.IO connection for the given network, subscribes for live
 * "changed" pushes, and invalidates the network + member queries when they
 * arrive — so the WebSocket is the primary data path. Publishes live connection
 * state to {@link useNetworkSocketStore} so consumers can fall back to polling
 * only while the socket is down. Central networks have no local sync worker, so
 * no socket is opened.
 *
 * Uses a dedicated (forceNew) socket so it never interferes with the org-chat
 * socket. On unmount it unsubscribes so the server can stop the loop.
 */
export const useNetworkMembersSocket = (nwid: string, central = false): void => {
	const utils = api.useUtils();
	const setConnected = useNetworkSocketStore((s) => s.setConnected);

	useEffect(() => {
		// No live socket for central networks (or before the id is known): reflect
		// "not connected" so consumers use the fallback poll.
		if (!nwid || central) {
			setConnected(false);
			return;
		}

		let cancelled = false;
		let socket: ReturnType<typeof io> | null = null;
		const channel = networkMembersChannel(nwid);

		(async () => {
			// Ensure the Socket.IO server is initialized, then connect.
			await fetch("/api/websocket");
			if (cancelled) return;

			socket = io({ forceNew: true });
			const subscribe = () => socket?.emit("subscribe:network", { nwid });
			socket.on("connect", () => {
				if (cancelled) return;
				setConnected(true);
				// (re)subscribe on every (re)connect.
				subscribe();
			});
			socket.on("disconnect", () => {
				if (cancelled) return;
				setConnected(false);
			});
			socket.on(channel, () => {
				void utils.network.getNetworkMembers.invalidate();
				void utils.network.getNetworkById.invalidate();
			});
		})();

		return () => {
			cancelled = true;
			setConnected(false);
			if (socket) {
				socket.emit("unsubscribe:network", { nwid });
				socket.off(channel);
				socket.off("connect");
				socket.off("disconnect");
				socket.disconnect();
			}
		};
	}, [nwid, central, utils, setConnected]);
};

export default useNetworkMembersSocket;
