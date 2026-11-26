import type { NextApiResponse } from "next";
import { getClientKey } from "~/utils/clientAddress";

type Options = {
	uniqueTokenPerInterval?: number;
	interval?: number;
};

// Helper function to get rate limit config values
// This ensures values are read at runtime, not module load time
function getApiWindowMs(): number {
	const windowMinutes = Number.parseInt(process.env.RATE_LIMIT_API_WINDOW || "1", 10);
	return (Number.isNaN(windowMinutes) ? 1 : windowMinutes) * 60 * 1000;
}

function getApiMaxRequests(): number {
	const maxRequests = Number.parseInt(
		process.env.RATE_LIMIT_API_MAX_REQUESTS || "50",
		10,
	);
	return Number.isNaN(maxRequests) ? 50 : maxRequests;
}

// Rate limit configuration - use functions for lazy evaluation
export const RATE_LIMIT_CONFIG = {
	get API_WINDOW_MS(): number {
		return getApiWindowMs();
	},
	get API_MAX_REQUESTS(): number {
		return getApiMaxRequests();
	},
};

type RateLimitRequest = Parameters<typeof getClientKey>[0];

type Counter = { count: number; expiresAt: number };

// Counters kept per limiter. Each one is a client and operation pair.
const DEFAULT_MAX_COUNTERS = 10000;

/**
 * Counts requests per client and per `token` (the operation being limited),
 * in a fixed window that starts with the client's first request. Each client
 * has its own budget, so one client using up its requests does not lock
 * anyone else out.
 *
 * A counter is only dropped before its window ends when the store is full,
 * and then the counter with the fewest requests goes first. Flooding the
 * store with new clients therefore cannot reset the budget of a client that
 * is close to, or over, its limit.
 */
export default function rateLimit(options?: Options) {
	const maxCounters = options?.uniqueTokenPerInterval || DEFAULT_MAX_COUNTERS;
	const windowMs = options?.interval || 60000;
	const counters = new Map<string, Counter>();

	const makeRoom = (now: number) => {
		for (const [key, counter] of counters) {
			if (counter.expiresAt <= now) counters.delete(key);
		}
		while (counters.size >= maxCounters) {
			let lowestKey: string | undefined;
			let lowestCount = Number.POSITIVE_INFINITY;
			for (const [key, counter] of counters) {
				if (counter.count < lowestCount) {
					lowestKey = key;
					lowestCount = counter.count;
				}
			}
			counters.delete(lowestKey);
		}
	};

	return {
		check: (
			req: RateLimitRequest,
			res: Pick<NextApiResponse, "setHeader"> | null | undefined,
			limit: number,
			token: string,
		) =>
			new Promise<void>((resolve, reject) => {
				const now = Date.now();
				const key = `${token}:${getClientKey(req)}`;
				let counter = counters.get(key);
				if (!counter || counter.expiresAt <= now) {
					counters.delete(key);
					if (counters.size >= maxCounters) makeRoom(now);
					counter = { count: 0, expiresAt: now + windowMs };
					counters.set(key, counter);
				}
				counter.count += 1;

				const currentUsage = counter.count;
				const isRateLimited = currentUsage >= limit;
				res?.setHeader("X-RateLimit-Limit", limit);
				res?.setHeader("X-RateLimit-Remaining", isRateLimited ? 0 : limit - currentUsage);

				return isRateLimited ? reject() : resolve();
			}),
		reset: () => counters.clear(),
	};
}
