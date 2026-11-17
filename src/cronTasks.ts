import * as cron from "cron";
import { prisma } from "./server/db";
import * as ztController from "~/utils/ztApi";

import { reconcileNetworkMembers } from "./server/api/services/memberService";
import {
	MEMBER_STATUS_LOG_IDLE_POLL_SECONDS,
	pruneMemberStatusEvents,
	runMemberStatusSampler,
	samplerState,
} from "./server/api/services/memberStatusLogService";

type FakeContext = {
	session: {
		user: {
			id: string;
		};
	};
};

/**
 * Checks for expired users and deactivates them.
 * This includes both individually expired users and users in expired groups.
 * Returns the number of users that were deactivated.
 */
export const checkAndDeactivateExpiredUsers = async (): Promise<number> => {
	// Check for individually expired users
	const expUsers = await prisma.user.findMany({
		where: {
			expiresAt: {
				lt: new Date(),
			},
			isActive: true,
			NOT: {
				role: "ADMIN",
			},
		},
		select: {
			network: true,
			id: true,
			role: true,
		},
	});

	// Check for users in expired groups
	const usersInExpiredGroups = await prisma.user.findMany({
		where: {
			isActive: true,
			NOT: {
				role: "ADMIN",
			},
			userGroup: {
				expiresAt: {
					lt: new Date(),
				},
			},
		},
		select: {
			network: true,
			id: true,
			role: true,
			userGroup: {
				select: {
					name: true,
					expiresAt: true,
				},
			},
		},
	});

	// Combine both expired user types (need to type them properly)
	const allExpiredUsers: Array<{
		network: Array<{ nwid: string }>;
		id: string;
		role: string;
		userGroup?: {
			name: string;
			expiresAt: Date | null;
		} | null;
	}> = [
		...expUsers.map((user) => ({ ...user, userGroup: undefined })),
		...usersInExpiredGroups,
	];

	// if no users return
	if (allExpiredUsers.length === 0) return 0;

	for (const userObj of allExpiredUsers) {
		if (userObj.role === "ADMIN") continue;

		const context: FakeContext = {
			session: {
				user: {
					id: userObj.id,
				},
			},
		};

		// Deauthorize all network members for this user
		for (const network of userObj.network) {
			try {
				const members = await ztController.network_members(
					// @ts-ignore
					context,
					network.nwid,
					false,
				);
				for (const member in members) {
					const ctx = {
						session: {
							user: {
								id: userObj.id,
							},
						},
					};
					await ztController.member_update({
						// @ts-ignore
						ctx,
						nwid: network.nwid,
						central: false,
						memberId: member,
						updateParams: {
							authorized: false,
						},
					});
				}
			} catch (error) {
				// Continue with other networks if one fails
				console.error(
					`Failed to deauthorize members for network ${network.nwid}:`,
					error,
				);
			}
		}

		// update user isActive to false
		await prisma.user.update({
			where: {
				id: userObj.id,
			},
			data: {
				isActive: false,
			},
		});
	}

	return allExpiredUsers.length;
};

export const CheckExpiredUsers = async () => {
	new cron.CronJob(
		// "*/10 * * * * *", // every 10 seconds ( testing )
		"0 0 0 * * *", // 12:00:00 AM (midnight) every day
		async () => {
			try {
				await checkAndDeactivateExpiredUsers();
			} catch (error) {
				console.error("Error in CheckExpiredUsers cron job:", error);
			}
		},
		null,
		true,
		"America/Los_Angeles",
	);
};

/**
 * Reconciles the networks of every user that has been inactive for five
 * minutes. Viewed networks are synced by the SyncManager, so this is only the
 * backstop that keeps idle networks converged with the controller.
 * Returns the ids of the networks that were reconciled.
 */
export const reconcileInactiveUsersNetworks = async (): Promise<string[]> => {
	// fetch all users
	const users = await prisma.user.findMany({
		where: {
			isActive: true,
		},
		select: {
			id: true,
			lastseen: true,
			memberOfOrgs: {
				select: {
					networks: true,
				},
			},
		},
	});

	// if no users return
	if (users.length === 0) return [];

	// Get all users that have been inactive for 5 minutes
	const now = new Date();
	const fiveMinutesAgo = new Date(now.getTime() - 5 * 60000);
	const inactiveUsers = users.filter((user) => {
		return user?.lastseen && new Date(user.lastseen) < fiveMinutesAgo;
	});

	// keep track of processed networks
	const processedNetworks = new Set<string>();

	// fetch all networks for each user
	for (const user of inactiveUsers) {
		const networks = await prisma.network.findMany({
			where: {
				authorId: user.id,
			},
			select: {
				nwid: true,
			},
		});

		// include get organization networks
		const organizationNetworks =
			user.memberOfOrgs?.flatMap((org) =>
				org.networks.map((network) => ({
					nwid: network.nwid,
				})),
			) ?? [];

		// merge user and organization networks
		const allNetworks = [...networks, ...organizationNetworks];

		// A user without networks must only be skipped. Returning here would end
		// the run and leave every user after this one without the backstop.
		if (allNetworks.length === 0) continue;

		// fetch all members for each network
		for (const network of allNetworks) {
			if (network && !processedNetworks.has(network.nwid)) {
				processedNetworks.add(network.nwid);
				const context: FakeContext = {
					session: {
						user: {
							id: user.id,
						},
					},
				};

				// Reconcile members against the controller (revision-delta +
				// self-healing). Replaces the old per-member N+1 fetch + write storm,
				// and serves as the periodic backstop that keeps idle networks' caches
				// converged with the controller.
				await reconcileNetworkMembers(
					// @ts-expect-error fake context for the cron
					context,
					network.nwid,
				);
			}
		}
	}

	return [...processedNetworks];
};

/**
 * Updates the peers for all active users and their networks.
 * This function is scheduled to run periodically using a cron job.
 *
 * Run every 5 minutes and if user is offline. There is no reason to update if the user is online.
 * https://github.com/sinamics/ztnet/issues/313
 */
export const updatePeers = async () => {
	new cron.CronJob(
		// updates every 5 minutes

		// "*/10 * * * * *", // every 10 seconds ( testing )
		// Backstop only: viewed networks are synced every ~10s by the SyncManager
		// (Socket.IO subscription-driven). Idle networks reconcile every 10 min here.
		"*/10 * * * *", // every 10min
		async () => {
			try {
				await reconcileInactiveUsersNetworks();
			} catch (error) {
				console.error("cron task updatePeers:", error);
			}
		},
		null,
		true,
		"America/Los_Angeles",
	);
};

/**
 * Member status log sampler.
 *
 * Asks the controller for its peer list once per sample interval and stores a
 * row for every node whose connection status changed. It is deliberately not
 * driven by the member reconcile: that runs every 10 seconds for networks
 * somebody is looking at and every 10 minutes for the rest, which would make
 * the log more detailed for some networks than for others.
 *
 * The interval is an admin setting in seconds, so this is a timer that
 * re-arms itself rather than a fixed cron expression. Every run reads the
 * settings, and saving them wakes the timer, so enabling or disabling the log
 * needs no restart. While the log is disabled a run is one settings read.
 */
export const memberStatusSampler = async () => {
	const state = samplerState();
	let timer: NodeJS.Timeout | undefined;
	let running = false;

	const run = async () => {
		if (running) return;
		running = true;
		let delay = MEMBER_STATUS_LOG_IDLE_POLL_SECONDS;
		try {
			delay = await runMemberStatusSampler();
		} catch (error) {
			// Controller or database not reachable. Skip this sample, an
			// unanswered call says nothing about the members.
			console.error("cron task memberStatusSampler:", error);
		} finally {
			running = false;
			clearTimeout(timer);
			timer = setTimeout(run, delay * 1000);
			timer.unref?.();
		}
	};

	state.wake = () => {
		clearTimeout(timer);
		void run();
	};

	void run();
};

/**
 * Removes member status events older than the retention set by the admin.
 * Runs whether or not the log is enabled, so events from an earlier period
 * still age out after the log has been turned off.
 */
export const pruneMemberStatusLog = async () => {
	new cron.CronJob(
		"0 30 3 * * *", // 03:30 every day
		async () => {
			try {
				await pruneMemberStatusEvents();
			} catch (error) {
				console.error("cron task pruneMemberStatusLog:", error);
			}
		},
		null,
		true,
		"America/Los_Angeles",
	);
};
