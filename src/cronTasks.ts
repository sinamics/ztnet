import * as cron from "cron";
import { prisma } from "./server/db";
import * as ztController from "~/utils/ztApi";

type FakeContext = {
	session: {
		user: {
			id: number;
		};
	};
};

const CheckExpiredUsers = async () => {
	new cron.CronJob(
		// "*/10 * * * * *", // every 10 seconds ( testing )
		"0 0 0 * * *", // 12:00:00 AM (midnight) every day
		async () => {
			const expUsers = await prisma.user.findMany({
				where: {
					expiresAt: {
						lt: new Date(),
					},
					isActive: true,
				},
				select: {
					network: true,
					id: true,
					role: true,
				},
			});

			// if no users return
			if (expUsers.length === 0) return;

			for (const userObj of expUsers) {
				if (userObj.role === "ADMIN") continue;

				const context: FakeContext = {
					session: {
						user: {
							id: userObj.id,
						},
					},
				};

				for (const network of userObj.network) {
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
		},
		null,
		true,
		"America/Los_Angeles",
	);
};

await CheckExpiredUsers();
