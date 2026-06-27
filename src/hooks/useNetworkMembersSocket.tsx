import { useEffect } from "react";
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
 */
export const useNetworkMembersSocket = (nwid: string, central = false) => {
	const utils = api.useUtils();

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
			// (re)subscribe on every (re)connect.
			socket.on("connect", subscribe);
			socket.on(channel, () => {
				void utils.network.getNetworkMembers.invalidate();
				void utils.network.getNetworkById.invalidate();
			});
		})();

		return () => {
			cancelled = true;
			if (socket) {
				socket.emit("unsubscribe:network", { nwid });
				socket.off(channel);
				socket.disconnect();
			}
		};
	}, [nwid, central, utils]);
};

export default useNetworkMembersSocket;
