import { createNextApiHandler } from "@trpc/server/adapters/next";

import { env } from "~/env.mjs";
import { createTRPCContext } from "~/server/api/trpc";
import { appRouter } from "~/server/api/root";

// export API handler
export default createNextApiHandler({
	router: appRouter,
	createContext: createTRPCContext,
	// Never let a caching layer (reverse proxy / CDN) hold on to a tRPC
	// response. These are authenticated, per-request payloads; a cached GET
	// makes react-query invalidations and polling return stale data, so the
	// UI only refreshed after a full page reload.
	responseMeta() {
		return {
			headers: {
				"cache-control": "no-store, no-cache, must-revalidate",
			},
		};
	},
	onError:
		env.NODE_ENV === "development"
			? ({ path, error }) => {
					console.error(`❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`);
				}
			: undefined,
});
