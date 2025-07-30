import * as cron from "cron";
import { prisma } from "./server/db";
import * as ztController from "~/utils/ztApi";

import { syncMemberPeersAndStatus } from "./server/api/services/memberService";

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
		"*/5 * * * *", // every 5min
		async () => {
			try {
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
				if (users.length === 0) return;

				// Get all users that have been inactive for 5 minutes
				const now = new Date();
				const fiveMinutesAgo = new Date(now.getTime() - 5 * 60000);
				const inactiveUsers = users.filter((user) => {
					return user?.lastseen && new Date(user.lastseen) < fiveMinutesAgo;
				});

				// keep track of processed networks
				const processedNetworks = new Set();

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
					const organizationNetworks = user.memberOfOrgs?.flatMap((org) =>
						org.networks.map((network) => ({
							nwid: network.nwid,
						})),
					);

					// merge user and organization networks
					const allNetworks = [...networks, ...organizationNetworks];

					// if no networks return
					if (allNetworks.length === 0) return;

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

							// get members from the zt controller
							const ztControllerResponse = await ztController.local_network_detail(
								// @ts-expect-error
								context,
								network.nwid,
								false,
							);
							if (!ztControllerResponse || !("members" in ztControllerResponse)) return;

							await syncMemberPeersAndStatus(
								// @ts-expect-error
								context,
								network?.nwid,
								ztControllerResponse.members,
							);
						}
					}
				}
			} catch (error) {
				console.error("cron task updatePeers:", error);
			}
		},
		null,
		true,
		"America/Los_Angeles",
	);
};
