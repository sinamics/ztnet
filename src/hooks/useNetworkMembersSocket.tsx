import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { api } from "~/utils/api";
import { networkMembersChannel } from "~/utils/socketChannels";

/**
 * Subscribes to live member updates for a network over Socket.IO. While mounted,
 * the server reconciles this network every ~10s and pushes a "changed" event when
 * something actually changed; we then refetch the (DB-first) member list. On
 * unmount we unsubscribe so the server can stop the loop when no one is viewing.
 *
 * Uses a dedicated (forceNew) socket so it never interferes with the org-chat
 * socket. Central networks are not handled by the local sync worker.
 *
 * Returns whether the live socket is currently connected, so the caller can fall
 * back to a faster safety poll only when live updates aren't flowing.
 */
export const useNetworkMembersSocket = (nwid: string, central = false): boolean => {
	const utils = api.useUtils();
	const [isConnected, setIsConnected] = useState(false);

	useEffect(() => {
		if (!nwid || central) return;

		let cancelled = false;
		let socket: ReturnType<typeof io> | null = null;
		const channel = networkMembersChannel(nwid);

		(async () => {
			// Ensure the Socket.IO server is initialized, then connect.
			await fetch("/api/websocket");
			if (cancelled) return;

			socket = io({ forceNew: true });
			const subscribe = () => socket?.emit("subscribe:network", { nwid });
			// (re)subscribe on every (re)connect, and track connection state so the
			// table can speed up its safety poll while the socket is down.
			socket.on("connect", () => {
				setIsConnected(true);
				subscribe();
			});
			socket.on("disconnect", () => setIsConnected(false));
			socket.on(channel, () => {
				void utils.network.getNetworkMembers.invalidate();
				void utils.network.getNetworkById.invalidate();
			});
		})();

		return () => {
			cancelled = true;
			setIsConnected(false);
			if (socket) {
				socket.emit("unsubscribe:network", { nwid });
				socket.off(channel);
				socket.disconnect();
			}
		};
	}, [nwid, central, utils]);

	return isConnected;
};

export default useNetworkMembersSocket;
