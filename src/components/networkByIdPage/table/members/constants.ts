// Shared constants for the Network Members table.

// ZeroTier peer connection status, as reported on `member.conStatus`.
export enum ConnectionStatus {
	Offline = 0,
	Relayed = 1,
	DirectLAN = 2,
	DirectWAN = 3,
	Controller = 4,
}

// localStorage keys for persisted table preferences.
export const SORTING_STORAGE_KEY = "membersTableSorting";
export const EXTENDED_VIEW_STORAGE_KEY = "membersTableExtendedView";

// Default sort: newest member id first.
export const DEFAULT_SORTING = [{ id: "id", desc: true }];

// Minimum width of the table before the horizontal scroll container kicks in.
// Roughly matches the old fixed-layout footprint, so mid-size viewports don't
// gain scroll; with `table-auto` + `w-full`, columns still expand toward their
// `maxSize` (showing full IPv6) when the viewport is wider.
export const TABLE_MIN_WIDTH = "min-w-[48rem]";

/**
 * Per-column min/max width bounds (pixels), fed into the TanStack column defs as
 * `minSize`/`maxSize` and applied as CSS `min-width`/`max-width` (NOT fixed
 * `width`). With `table-auto`, columns size to content between these bounds, so
 * each column's sizing is independent — widening one no longer steals from the
 * others. Long columns (IP/physical) get a generous max so a full IPv6 address
 * (~39 chars) shows on a wide viewport before truncation/scroll takes over.
 */
export const COLUMN_SIZING: Record<string, { minSize: number; maxSize: number }> = {
	authorized: { minSize: 56, maxSize: 80 },
	name: { minSize: 120, maxSize: 240 },
	description: { minSize: 140, maxSize: 320 },
	id: { minSize: 96, maxSize: 140 },
	ipAssignments: { minSize: 180, maxSize: 420 },
	physicalAddress: { minSize: 120, maxSize: 360 },
	conStatus: { minSize: 96, maxSize: 170 },
	action: { minSize: 120, maxSize: 170 },
};
