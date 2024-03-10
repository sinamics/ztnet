export async function register() {
	if (process.env.NEXT_RUNTIME === "nodejs") {
		const cronTasksModule = await import("./cronTasks");
		if (cronTasksModule.CheckExpiredUsers) {
			cronTasksModule.CheckExpiredUsers();
		}

		// update lastseen for all members
		// if (cronTasksModule.updatePeers) {
		// 	cronTasksModule.updatePeers();
		// }
	}
}
