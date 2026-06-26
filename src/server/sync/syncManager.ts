import type { Server as SocketIOServer } from "socket.io";
import type { UserContext } from "~/types/ctx";
import type { MemberEntity } from "~/types/local/member";
import { reconcileNetworkMembersOnce } from "~/server/api/services/memberService";
import { networkMembersChannel } from "~/utils/socketChannels";

/**
 * SyncManager
 *
 * Subscription-driven controller→DB reconcile worker. While at least one client
 * is viewing a network (a Socket.IO subscriber), that network is reconciled on a
 * ~10s cadence and a "changed" event is pushed to the room so the UI updates live
 * — no client polling. When the last viewer leaves, the loop stops and the network
 * falls back to the slow cron backstop.
 *
 * The loop is self-scheduling (each tick schedules the next only after it
 * finishes), so a slow reconcile (e.g. 20s) can never overlap itself; combined
 * with `reconcileNetworkMembersOnce`'s in-flight guard, a network is never synced
 * twice concurrently.
 */
export const SYNC_INTERVAL_MS = 10_000;

export const networkRoom = networkMembersChannel;

const hashMembers = (members: MemberEntity[]): string =>
	members
		.map(
			(m) =>
				`${m.id}:${m.authorized ? 1 : 0}:${m.conStatus ?? ""}:${(
					m.ipAssignments ?? []
				).join(",")}:${m.name ?? ""}`,
		)
		.sort()
		.join("|");

interface NetworkSyncState {
	refCount: number;
	ctx: UserContext;
	timer: ReturnType<typeof setTimeout> | null;
	lastHash: string;
}

class SyncManager {
	private io: SocketIOServer | null = null;
	private networks = new Map<string, NetworkSyncState>();

	/** Start (or ref-count) the live sync loop for a network. */
	acquire(io: SocketIOServer, ctx: UserContext, nwid: string): void {
		this.io = io;
		const existing = this.networks.get(nwid);
		if (existing) {
			existing.refCount += 1;
			return;
		}
		this.networks.set(nwid, { refCount: 1, ctx, timer: null, lastHash: "" });
		void this.tick(nwid);
	}

	/** Drop a viewer; stop the loop when the last one leaves. */
	release(nwid: string): void {
		const state = this.networks.get(nwid);
		if (!state) return;
		state.refCount -= 1;
		if (state.refCount <= 0) {
			if (state.timer) clearTimeout(state.timer);
			this.networks.delete(nwid);
		}
	}

	private async tick(nwid: string): Promise<void> {
		const state = this.networks.get(nwid);
		if (!state) return;
		state.timer = null;
		const start = Date.now();
		try {
			const members = await reconcileNetworkMembersOnce(state.ctx, nwid);
			const hash = hashMembers(members);
			if (hash !== state.lastHash) {
				state.lastHash = hash;
				this.io?.to(networkRoom(nwid)).emit(networkRoom(nwid));
			}
		} catch (err) {
			console.error(`SyncManager: reconcile failed for ${nwid}:`, err);
		} finally {
			// Reschedule only while still subscribed — never overlaps, since the
			// next tick is queued only after this one completes.
			const current = this.networks.get(nwid);
			if (current && current.refCount > 0) {
				const delay = Math.max(0, SYNC_INTERVAL_MS - (Date.now() - start));
				current.timer = setTimeout(() => void this.tick(nwid), delay);
			}
		}
	}

	// --- test/introspection helpers ---
	isSyncing(nwid: string): boolean {
		return this.networks.has(nwid);
	}
	refCount(nwid: string): number {
		return this.networks.get(nwid)?.refCount ?? 0;
	}
}

export const syncManager = new SyncManager();
