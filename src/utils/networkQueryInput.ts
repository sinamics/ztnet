/**
 * Input for the `network.getNetworkById` query.
 *
 * The input is also the React Query cache key, and `{ nwid }` is a different
 * key than `{ nwid, central: false }` even though the server treats them the
 * same. Pages and components that read or invalidate this query must build the
 * input here so they always share one cache entry.
 */
export const networkByIdInput = (nwid: string, central = false) => ({ nwid, central });
