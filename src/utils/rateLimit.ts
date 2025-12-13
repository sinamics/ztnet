import type { NextApiResponse } from "next";
import { LRUCache } from "lru-cache";

type Options = {
	uniqueTokenPerInterval?: number;
	interval?: number;
};

// Rate limit configuration from environment variables
// These are exported so they can be used by API routes
export const RATE_LIMIT_CONFIG = {
	// Time window in minutes (default: 1 minute for REST API)
	API_WINDOW_MS:
		(Number.parseInt(process.env.RATE_LIMIT_API_WINDOW || "1", 10) || 1) * 60 * 1000,
	// Max requests per window for REST API (default: 50)
	API_MAX_REQUESTS:
		Number.parseInt(process.env.RATE_LIMIT_API_MAX_REQUESTS || "50", 10) || 50,
} as const;

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
