import { prisma } from "~/server/db";

export const ACTIVITY_LOG_RETENTION_LIMITS = { min: 1, max: 3650 };
export const ACTIVITY_LOG_PRUNE_BATCH_SIZE = 5000;

/**
 * Deletes activity log rows older than the retention set by the admin. Without
 * a retention every row is kept, which is also how it was before the setting
 * existed.
 *
 * Deletes in batches, each its own statement, so the first prune of a large
 * log does not hold one long transaction or need its whole size in WAL at
 * once. A failure keeps the batches already deleted; the next run continues.
 */
export const pruneActivityLogEntries = async (
	now: Date = new Date(),
	retentionDays?: number | null,
	batchSize: number = ACTIVITY_LOG_PRUNE_BATCH_SIZE,
): Promise<number> => {
	const days =
		retentionDays !== undefined
			? retentionDays
			: ((
					await prisma.globalOptions.findFirst({
						where: { id: 1 },
						select: { activityLogRetentionDays: true },
					})
				)?.activityLogRetentionDays ?? null);
	if (!days) return 0;

	const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
	let total = 0;
	for (;;) {
		const batch = await prisma.activityLog.findMany({
			where: { createdAt: { lt: cutoff } },
			select: { id: true },
			orderBy: [{ createdAt: "asc" }, { id: "asc" }],
			take: batchSize,
		});
		if (batch.length === 0) break;
		const { count } = await prisma.activityLog.deleteMany({
			where: { id: { in: batch.map((row) => row.id) } },
		});
		total += count;
		if (batch.length < batchSize) break;
	}
	return total;
};
