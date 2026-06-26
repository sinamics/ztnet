// Global `jest` so ts-jest hoists this mock above the import.
jest.mock("~/server/api/services/memberService", () => ({
	reconcileNetworkMembersOnce: jest.fn(),
}));

import { reconcileNetworkMembersOnce } from "~/server/api/services/memberService";
import { syncManager, networkRoom, SYNC_INTERVAL_MS } from "~/server/sync/syncManager";

// biome-ignore lint/suspicious/noExplicitAny: test helper
const recon = reconcileNetworkMembersOnce as any;
const ctx = {} as never;

const makeIo = () => {
	const emit = jest.fn();
	const to = jest.fn(() => ({ emit }));
	return { io: { to } as never, to, emit };
};

// biome-ignore lint/suspicious/noExplicitAny: minimal member fixture
const member = (over: Record<string, unknown> = {}): any => ({
	id: "a",
	authorized: true,
	conStatus: 2,
	ipAssignments: ["10.0.0.1"],
	name: "n",
	...over,
});

beforeEach(() => {
	jest.useFakeTimers();
	recon.mockReset();
});
afterEach(() => {
	jest.useRealTimers();
});

describe("SyncManager", () => {
	test("ref-counts viewers and stops the loop when the last leaves", async () => {
		recon.mockResolvedValue([member()]);
		const { io } = makeIo();

		syncManager.acquire(io, ctx, "nw_ref");
		expect(syncManager.isSyncing("nw_ref")).toBe(true);
		expect(syncManager.refCount("nw_ref")).toBe(1);

		syncManager.acquire(io, ctx, "nw_ref"); // second viewer — no new loop
		expect(syncManager.refCount("nw_ref")).toBe(2);

		syncManager.release("nw_ref");
		expect(syncManager.isSyncing("nw_ref")).toBe(true); // still one viewer

		syncManager.release("nw_ref");
		expect(syncManager.isSyncing("nw_ref")).toBe(false); // loop stopped

		await jest.advanceTimersByTimeAsync(SYNC_INTERVAL_MS * 2); // no further ticks
	});

	test("never overlaps: a slow reconcile blocks the next tick until it finishes", async () => {
		let resolveRecon: (v: unknown) => void = () => {};
		recon.mockReturnValue(
			new Promise((r) => {
				resolveRecon = r;
			}),
		);
		const { io } = makeIo();

		syncManager.acquire(io, ctx, "nw_slow");
		expect(recon).toHaveBeenCalledTimes(1);

		// Even well past the interval, the still-running reconcile is not re-run.
		await jest.advanceTimersByTimeAsync(SYNC_INTERVAL_MS * 3);
		expect(recon).toHaveBeenCalledTimes(1);

		// Once it completes, the next tick is scheduled.
		recon.mockResolvedValue([member()]);
		resolveRecon([member()]);
		await jest.advanceTimersByTimeAsync(SYNC_INTERVAL_MS + 5);
		expect(recon.mock.calls.length).toBeGreaterThanOrEqual(2);

		syncManager.release("nw_slow");
		await jest.advanceTimersByTimeAsync(SYNC_INTERVAL_MS * 2);
	});

	test("emits to the network room only when the member state changes", async () => {
		recon.mockResolvedValue([member({ conStatus: 2 })]);
		const { io, to, emit } = makeIo();

		syncManager.acquire(io, ctx, "nw_emit");
		await jest.advanceTimersByTimeAsync(1); // let the first tick settle
		expect(to).toHaveBeenCalledWith(networkRoom("nw_emit"));
		expect(emit).toHaveBeenCalledTimes(1); // first sync → changed from empty

		// Same data next tick → no emit.
		await jest.advanceTimersByTimeAsync(SYNC_INTERVAL_MS);
		expect(emit).toHaveBeenCalledTimes(1);

		// Status flips → emit again.
		recon.mockResolvedValue([member({ conStatus: 0 })]);
		await jest.advanceTimersByTimeAsync(SYNC_INTERVAL_MS);
		expect(emit).toHaveBeenCalledTimes(2);

		syncManager.release("nw_emit");
		await jest.advanceTimersByTimeAsync(SYNC_INTERVAL_MS * 2);
	});
});
