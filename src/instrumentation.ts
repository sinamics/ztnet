export async function register() {
	if (process.env.NEXT_RUNTIME === "nodejs") {
		const cronTasksModule = await import("./cronTasks");
		if (cronTasksModule.CheckExpiredUsers) {
			cronTasksModule.CheckExpiredUsers();
		}

		// update lastseen for all members
		if (cronTasksModule.updatePeers) {
			cronTasksModule.updatePeers();
		}

		// member status log: sampler and daily prune. Both do nothing until an
		// admin enables the log.
		if (cronTasksModule.memberStatusSampler) {
			cronTasksModule.memberStatusSampler();
		}
		if (cronTasksModule.pruneMemberStatusLog) {
			cronTasksModule.pruneMemberStatusLog();
		}

		// activity log: daily prune, does nothing until an admin sets a retention
		if (cronTasksModule.pruneActivityLog) {
			cronTasksModule.pruneActivityLog();
		}
	}
}
