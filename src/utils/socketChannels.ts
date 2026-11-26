/**
 * Socket.IO channel/room name for live updates of a network's members and
 * options. Shared by the server (SyncManager emit, tRPC mutation push, the
 * connection handler) and the client subscription hook so the name can't drift.
 * Kept dependency-free so it is safe to import from client code.
 */
export const networkMembersChannel = (nwid: string) => `network-members:${nwid}`;

/**
 * Socket.IO room that holds every socket of one user. The server joins a
 * socket to it on connect, from the session, so user scoped events such as
 * organization chat messages can be addressed to exactly the right people.
 */
export const userRoom = (userId: string) => `user:${userId}`;
