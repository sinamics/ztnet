import type { NextApiResponse } from "next";
import { LRUCache } from "lru-cache";

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

export default function rateLimit(options?: Options) {
	const tokenCache = new LRUCache({
		max: options?.uniqueTokenPerInterval || 500,
		ttl: options?.interval || 60000,
	});

	return {
		check: (res: NextApiResponse, limit: number, token: string) =>
			new Promise<void>((resolve, reject) => {
				const tokenCount = (tokenCache.get(token) as number[]) || [0];
				if (tokenCount[0] === 0) {
					tokenCache.set(token, tokenCount);
				}
				tokenCount[0] += 1;

				const currentUsage = tokenCount[0];
				const isRateLimited = currentUsage >= limit;
				res.setHeader("X-RateLimit-Limit", limit);
				res.setHeader("X-RateLimit-Remaining", isRateLimited ? 0 : limit - currentUsage);

				return isRateLimited ? reject() : resolve();
			}),
		reset: () => tokenCache.clear(),
	};
}
