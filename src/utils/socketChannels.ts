/**
 * Socket.IO channel/room name for live updates of a network's members and
 * options. Shared by the server (SyncManager emit, tRPC mutation push, the
 * connection handler) and the client subscription hook so the name can't drift.
 * Kept dependency-free so it is safe to import from client code.
 */
export const networkMembersChannel = (nwid: string) => `network-members:${nwid}`;
