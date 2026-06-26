import { UserContext } from "~/types/ctx";
import { MemberEntity, Peers } from "~/types/local/member";
import { determineConnectionStatus } from "../utils/memberUtils";
import * as ztController from "~/utils/ztApi";
import { prisma } from "~/server/db";
import { sendWebhook } from "~/utils/webhook";
import { HookType, MemberJoined } from "~/types/webhooks";
import { throwError } from "~/server/helpers/errorHandler";
import { network_members } from "@prisma/client";

/**
 * syncMemberPeersAndStatus
 * Synchronizes the peers and connection status of the given members.
 * @param ctx - The user context.
 * @param members - An array of member entities.
 */
export const syncMemberPeersAndStatus = async (
	ctx: UserContext,
	nwid: string,
	ztMembers: MemberEntity[],
) => {
	if (ztMembers.length === 0) return [];

	// PERFORMANCE OPTIMIZATION: Fetch all database members in a single query instead of N queries
	const dbMembersArray = await prisma.network_members.findMany({
		where: {
			nwid,
			id: { in: ztMembers.map((m) => m.id) },
			deleted: false,
		},
		include: { notations: { include: { label: true } } },
	});

	// Create a Map for O(1) lookup instead of repeated database queries
	const dbMembersMap = new Map(dbMembersArray.map((m) => [m.id, m]));

	// get peers
	const controllerPeers = await ztController.peers(ctx);

	//!TODO Promise.all causing race condition. Need to refactor to use for loop
	const updatedMembers = await Promise.all(
		ztMembers.map(async (ztMember) => {
			// TODO currently there is no way to distinguish peers by network id, so we have to fetch all peers
			// this will make the node active in all networks it is part of if it is active in one of them.
			// Should open a issue at ZeroTier
			const peers = controllerPeers.filter(
				(peer) => peer.address === ztMember.address,
			)[0];

			// PERFORMANCE: Retrieve from in-memory Map instead of database query
			const dbMember = dbMembersMap.get(ztMember.id) || null;

			// Find the active preferred path in the peers object
			const activePreferredPath = findActivePreferredPeerPath(peers);
			const { physicalAddress, ...restOfDbMembers } = dbMember || {};

			// Capture DB name before merge so we can restore it if controller data overwrites with empty value
			// Need to safely access because restOfDbMembers may be an empty object
			const dbName = (restOfDbMembers as { name?: string } | undefined)?.name;

			// Merge the data from the database with the data from Controller
			const updatedMember = {
				...restOfDbMembers,
				...ztMember,
				physicalAddress: activePreferredPath?.address ?? physicalAddress,
				peers: peers || {},
			} as MemberEntity;

			// ISSUE #719: Smart name preservation - use database name if available, fallback to controller name
			if (dbName?.trim()) {
				// Database has a name - use it (preserves user customizations)
				updatedMember.name = dbName;
			} else if (!dbName && ztMember.name && ztMember.name.trim()) {
				// Database has no name but controller does - use controller name
				updatedMember.name = ztMember.name;
			} else if (dbName && !updatedMember.name) {
				// Fallback: preserve any database name if controller provides empty
				updatedMember.name = dbName;
			}

			// Update the connection status
			updatedMember.conStatus = determineConnectionStatus(updatedMember);

			// Check if the member is connected and has peers
			const memberIsOnline =
				Object.keys(updatedMember.peers).length > 0 && updatedMember.conStatus !== 0;

			// Create the object with the data to be updated
			const updateData: Partial<network_members> = {
				id: updatedMember.id,
				address: updatedMember.address,
				authorized: updatedMember.authorized,
				online: memberIsOnline,
			};

			// add lastSeen to updateData if the member is connected
			if (memberIsOnline) {
				updateData.lastSeen = new Date();
			}

			// update physicalAddress if the member is connected
			if (memberIsOnline && updatedMember?.physicalAddress) {
				updateData.physicalAddress = updatedMember.physicalAddress;
			}

			// ISSUE #719: Persist resolved name to database to ensure consistency
			if (updatedMember.name !== dbMember?.name) {
				updateData.name = updatedMember.name;
			}

			// Update the member in the database
			const updateResult = await prisma.network_members.updateMany({
				where: { nwid: updatedMember.nwid, id: updatedMember.id },
				data: updateData,
			});

			// If the member was not found in the database, add it
			if (updateResult.count === 0) {
				await addNetworkMember(ctx, updatedMember).catch(console.error);
			}

			// Return null if the member is deleted.
			if (!dbMember) {
				return null;
			}

			// Return the updated member
			return updatedMember;
		}),
	);
	// console.log(updatedMembers);
	// console.log(updatedMembers[0].peers?.paths);
	return updatedMembers.filter(Boolean); // Filter out any null values
};

/**
 * Determines the active preferred path from the given peers.
 *
 * @param peers - The peers object containing paths.
 * @returns The active preferred path, or undefined if not found.
 */
const findActivePreferredPeerPath = (peers: Peers | null) => {
	if (!peers || typeof peers !== "object" || !Array.isArray(peers.paths)) {
		return null;
	}
	const { paths } = peers;
	const res = paths.find((path) => path?.active && path?.preferred);

	return { ...res };
};

const findExistingMemberName = async (
	ctx: UserContext,
	memberId: string,
	currentNwid: string,
	isOrganization: boolean,
	organizationId?: string,
) => {
	try {
		// First check database for existing name
		const whereClause =
			isOrganization && organizationId
				? {
						id: memberId,
						name: { not: null },
						deleted: false,
						nwid: { not: currentNwid },
						nwid_ref: {
							organizationId: organizationId,
						},
					}
				: {
						id: memberId,
						name: { not: null },
						deleted: false,
						nwid: { not: currentNwid },
						nwid_ref: {
							authorId: ctx.session.user.id,
							organizationId: null,
						},
					};

		const existingMember = await prisma.network_members.findFirst({
			where: whereClause,
			select: { name: true },
			orderBy: {
				creationTime: "desc",
			},
		});

		if (existingMember?.name) {
			return existingMember.name;
		}

		// If no name found in database, check controller
		const networks = await ztController.get_controller_networks(ctx, false);

		const relevantNetworks = await prisma.network.findMany({
			where: {
				AND: [
					{ nwid: { in: networks as string[] } },
					{ nwid: { not: currentNwid } },
					isOrganization && organizationId
						? { organizationId: organizationId }
						: {
								authorId: ctx.session.user.id,
								organizationId: null,
							},
				],
			},
			select: { nwid: true },
		});

		// Search for member in each network using controller
		for (const network of relevantNetworks) {
			try {
				const memberDetails = await ztController.member_details(
					ctx,
					network.nwid,
					memberId,
					false,
				);

				if (memberDetails?.name) {
					return memberDetails.name;
				}
			} catch (_error) {
				// Skip if member not found in this network
			}
		}

		return null;
	} catch (error) {
		console.error("Error finding existing member name:", error);
		return null;
	}
};

/**
 * Adds a member to the database.
 *
 * @param ctx - The context object.
 * @param member - The member entity to be added.
 * @returns A promise that resolves to the created network member.
 */
const addNetworkMember = async (ctx, member: MemberEntity) => {
	// 1. get the user options
	// 2. check if the new member is joining a organization network
	const [user, memberOfOrganization] = await Promise.all([
		prisma.user.findUnique({
			where: { id: ctx.session.user.id },
			select: { options: true, network: { select: { nwid: true } } },
		}),
		prisma.network.findFirst({
			where: { nwid: member.nwid },
			select: { organizationId: true, organization: { select: { settings: true } } },
		}),
	]);

	let name = null;

	// send webhook if the new member is joining a organization network
	if (memberOfOrganization) {
		// check if global organization member naming is enabled, and if so find the first available name
		if (memberOfOrganization.organization?.settings?.renameNodeGlobally) {
			name = await findExistingMemberName(
				ctx,
				member.id,
				member.nwid,
				true,
				memberOfOrganization.organizationId,
			);
		}
		try {
			// Send webhook
			await sendWebhook<MemberJoined>({
				hookType: HookType.NETWORK_JOIN,
				organizationId: memberOfOrganization.organizationId,
				memberId: member.id,
				networkId: member.nwid,
			});
		} catch (error) {
			// add error messge that webhook failed
			throwError(error.message);
		}

		// Send organization admin notification for new node joining
		try {
			const { sendOrganizationAdminNotification } = await import(
				"~/utils/organizationNotifications"
			);

			// Get network info for notification
			const network = await prisma.network.findUnique({
				where: { nwid: member.nwid },
				select: { name: true },
			});

			await sendOrganizationAdminNotification({
				organizationId: memberOfOrganization.organizationId,
				eventType: "NODE_ADDED",
				eventData: {
					networkId: member.nwid,
					networkName: network?.name || member.nwid,
					nodeId: member.id,
					nodeName: name || member.id,
				},
			});
		} catch (error) {
			// Don't fail the operation if notification fails
			console.error("Failed to send node added notification:", error);
		}
	}

	// Member is not joining an organization network
	if (!memberOfOrganization.organizationId) {
		// check if addMemberIdAsName is enabled, and if so use the member id as the name
		if (user.options?.addMemberIdAsName) {
			name = member.id;
		}

		// check if global naming is enabled, and if so find the first available name
		// NOTE! this will take precedence over addMemberIdAsName above
		if (user.options?.renameNodeGlobally) {
			name = (await findExistingMemberName(ctx, member.id, member.nwid, false)) || name;
		}
	}

	try {
		return await prisma.network_members.upsert({
			where: {
				id_nwid: {
					id: member.id,
					nwid: member.nwid,
				},
			},
			create: {
				id: member.id,
				lastSeen: new Date(),
				creationTime: new Date(),
				name,
				nwid_ref: { connect: { nwid: member.nwid } },
				deleted: false,
			},
			update: {
				lastSeen: new Date(),
			},
		});
	} catch (error) {
		console.error("Error upserting network member:", error);
	}
};

/**
 * Fetches zombie members from the database based on the provided network ID and enriched members.
 * A zombie member is a member that has been deleted.
 *
 * @param nwid - The network ID.
 * @param enrichedMembers - An array of enriched member entities.
 * @returns An array of zombie members.
 */
export const fetchZombieMembers = async (
	nwid: string,
	enrichedMembers: MemberEntity[],
) => {
	const getZombieMembersPromises = enrichedMembers.map((member) => {
		return prisma.network_members.findFirst({
			where: {
				nwid,
				id: member.id,
				deleted: true,
			},
		});
	});

	const zombieMembers = await Promise.all(getZombieMembersPromises);
	return zombieMembers.filter(Boolean);
};

const MEMBER_DETAIL_BATCH_SIZE = 5;

/**
 * Fetches full member detail from the controller for the given ids, in small
 * batches (the controller has no bulk member endpoint). Failures are skipped.
 */
const fetchMemberDetailsBatched = async (
	ctx: UserContext,
	nwid: string,
	ids: string[],
): Promise<MemberEntity[]> => {
	const results: MemberEntity[] = [];
	for (let i = 0; i < ids.length; i += MEMBER_DETAIL_BATCH_SIZE) {
		const batch = ids.slice(i, i + MEMBER_DETAIL_BATCH_SIZE);
		const batchResults = await Promise.all(
			batch.map((id) =>
				ztController.member_details(ctx, nwid, id, false).catch((err) => {
					console.error(`reconcileNetworkMembers: failed to fetch member ${id}:`, err);
					return null;
				}),
			),
		);
		for (const r of batchResults) if (r) results.push(r as MemberEntity);
	}
	return results;
};

/**
 * reconcileNetworkMembers
 *
 * Controller-truth, self-healing sync built to scale to large networks. The
 * ZeroTier controller has no bulk member endpoint, so fetching every member's
 * detail on every load is the bottleneck. Instead this:
 *   1. reads the cheap `{ memberId: revision }` map (the authoritative membership),
 *   2. fetches full detail ONLY for new or revision-changed members and caches
 *      their config (authorized, ipAssignments, flags, revision) in the DB,
 *   3. removes DB rows for members the controller no longer has (drift cleanup),
 *   4. computes live status from a single `peers` call (Map lookup, not O(n²)) and
 *      writes back only the members whose status actually changed.
 *
 * Pass `{ full: true }` to ignore cached revisions and refetch every member
 * (used by the periodic backstop resync).
 *
 * Returns the enriched, active members (DB-cached config + live status).
 */
export const reconcileNetworkMembers = async (
	ctx: UserContext,
	nwid: string,
	options: { full?: boolean } = {},
): Promise<MemberEntity[]> => {
	// 1. Authoritative membership + revisions from the controller (one cheap call).
	const revisionMap = (await ztController.network_members(ctx, nwid, false)) as Record<
		string,
		number
	>;
	const controllerIds = Object.keys(revisionMap);

	// 2. Current DB rows for this network.
	const dbMembers = await prisma.network_members.findMany({
		where: { nwid },
		include: { notations: { include: { label: true } } },
	});
	const dbMap = new Map(dbMembers.map((m) => [m.id, m]));

	// 3. Which members need a fresh detail fetch? New, revision-changed, or full
	//    resync. Stashed / permanently-deleted members stay hidden and are skipped.
	const idsToFetch = controllerIds.filter((id) => {
		const db = dbMap.get(id);
		if (db && (db.deleted || db.permanentlyDeleted)) return false;
		if (!db) return true;
		if (options.full) return true;
		return db.revision == null || db.revision !== revisionMap[id];
	});

	// 4. Fetch changed details (batched) and cache their config in the DB.
	const details = await fetchMemberDetailsBatched(ctx, nwid, idsToFetch);
	for (const detail of details) {
		const db = dbMap.get(detail.id);
		if (!db) {
			// New member: create the row (handles naming + join webhooks/notifications).
			await addNetworkMember(ctx, detail).catch(console.error);
		}
		await prisma.network_members.updateMany({
			where: { nwid, id: detail.id },
			data: {
				authorized: !!detail.authorized,
				ipAssignments: Array.isArray(detail.ipAssignments) ? detail.ipAssignments : [],
				noAutoAssignIps: !!detail.noAutoAssignIps,
				activeBridge: !!detail.activeBridge,
				address: detail.address ?? detail.id,
				revision: revisionMap[detail.id] ?? null,
				// Smart name preservation (#719): adopt the controller name only when the
				// DB has none — never clobber a user-set name.
				...(!db?.name?.trim() && detail.name?.trim() ? { name: detail.name } : {}),
			},
		});
	}

	// 5. Drift cleanup: active DB members the controller no longer knows about.
	const controllerIdSet = new Set(controllerIds);
	const orphanIds = dbMembers
		.filter((m) => !controllerIdSet.has(m.id) && !m.deleted && !m.permanentlyDeleted)
		.map((m) => m.id);
	if (orphanIds.length > 0) {
		await prisma.network_members.deleteMany({ where: { nwid, id: { in: orphanIds } } });
	}

	// 6. Live status from a single peers call (Map lookup instead of O(n²) filter).
	const controllerPeers = await ztController.peers(ctx);
	const peersByAddress = new Map<string, Peers>();
	for (const peer of controllerPeers) {
		peersByAddress.set(peer.address, peer as unknown as Peers);
	}

	// 7. Build the active member list from the reconciled DB rows + live status,
	//    writing back only members whose status actually changed.
	const activeDbMembers = await prisma.network_members.findMany({
		where: { nwid, id: { in: controllerIds }, deleted: false },
		include: { notations: { include: { label: true } } },
	});

	const statusWrites: Promise<unknown>[] = [];
	const enriched = activeDbMembers.map((db) => {
		const peers = peersByAddress.get(db.address || "") ?? ({} as Peers);
		const activePreferredPath = findActivePreferredPeerPath(peers);
		const member = {
			...db,
			peers,
			physicalAddress: activePreferredPath?.address ?? db.physicalAddress,
		} as unknown as MemberEntity;

		member.conStatus = determineConnectionStatus(member);
		const online = Object.keys(peers).length > 0 && member.conStatus !== 0;

		// diff-skip: offline-and-unchanged members are never rewritten.
		if (online || db.online !== online) {
			const data: Partial<network_members> = { online };
			if (online) {
				data.lastSeen = new Date();
				if (member.physicalAddress) data.physicalAddress = member.physicalAddress;
			}
			statusWrites.push(
				prisma.network_members.updateMany({ where: { nwid, id: db.id }, data }),
			);
		}
		return member;
	});

	await Promise.all(statusWrites);
	return enriched;
};

/**
 * attachLiveStatus
 *
 * Read-only enrichment: given DB member rows, attaches live peers + connection
 * status from a single controller `peers` call (no DB writes). Used by the
 * paginated read path so it can serve a page from the DB while still reflecting
 * up-to-the-moment online/Direct/Relayed status. Persisting that status is the
 * job of the background reconcile.
 */
export const attachLiveStatus = async (
	ctx: UserContext,
	members: network_members[],
): Promise<MemberEntity[]> => {
	const controllerPeers = await ztController.peers(ctx).catch(() => []);
	const peersByAddress = new Map<string, Peers>();
	for (const peer of controllerPeers) {
		peersByAddress.set(peer.address, peer as unknown as Peers);
	}
	return members.map((db) => {
		const peers = peersByAddress.get(db.address || "") ?? ({} as Peers);
		const activePreferredPath = findActivePreferredPeerPath(peers);
		const member = {
			...db,
			peers,
			physicalAddress: activePreferredPath?.address ?? db.physicalAddress,
		} as unknown as MemberEntity;
		member.conStatus = determineConnectionStatus(member);
		return member;
	});
};

// In-flight guard: keyed by network id, dedupes concurrent reconciles (the 10s
// poll, several open tabs, or getNetworkById + getNetworkMembers on the same
// page load) so they share a single controller sync instead of stacking.
const inFlightReconciles = new Map<string, Promise<MemberEntity[]>>();

/**
 * Reconcile a network's members, but only ONE reconcile per network runs at a
 * time — concurrent callers share the in-flight promise. Awaitable; used by the
 * cold-start (empty cache) read paths that must block until populated.
 */
export const reconcileNetworkMembersOnce = (
	ctx: UserContext,
	nwid: string,
	options: { full?: boolean } = {},
): Promise<MemberEntity[]> => {
	const existing = inFlightReconciles.get(nwid);
	if (existing) return existing;
	const run = reconcileNetworkMembers(ctx, nwid, options).finally(() => {
		inFlightReconciles.delete(nwid);
	});
	inFlightReconciles.set(nwid, run);
	return run;
};

/**
 * Fire-and-forget reconcile (deduped via reconcileNetworkMembersOnce). Returns
 * immediately; never throws into the caller. Used by warm read paths.
 */
export const triggerBackgroundReconcile = (
	ctx: UserContext,
	nwid: string,
	options: { full?: boolean } = {},
): void => {
	void reconcileNetworkMembersOnce(ctx, nwid, options).catch((err) => {
		console.error(`Background reconcile failed for network ${nwid}:`, err);
	});
};
