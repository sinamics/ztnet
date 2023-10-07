import { createTRPCRouter } from "~/server/api/trpc";
import { authRouter } from "./routers/authRouter";
import { networkMemberRouter } from "./routers/memberRouter";
import { networkRouter } from "./routers/networkRouter";
import { adminRouter } from "./routers/adminRoute";
import { settingsRouter } from "./routers/settingsRouter";
import { publicRouter } from "./routers/publicRouter";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
	network: networkRouter,
	networkMember: networkMemberRouter,
	auth: authRouter,
	admin: adminRouter,
	settings: settingsRouter,
	public: publicRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
