/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 */
import { type CreateNextContextOptions } from "@trpc/server/adapters/next";
import type { Session } from "~/lib/authTypes";
import type { Server as SocketIOServer } from "socket.io";
import { getServerAuthSession } from "~/lib/authSession";
import { prisma } from "~/server/db";
import { networkMembersChannel } from "~/utils/socketChannels";
import { withoutUserSecrets } from "~/server/api/userFields";

type CreateContextOptions = {
	session: Session | null;
	wss: SocketIOServer;
	res: NextApiResponse;
	req: CreateNextContextOptions["req"];
};

// custom type for the socket server
interface SocketServerCtx {
	res: {
		socket: {
			server?: {
				io?: SocketIOServer;
			};
		};
	};
}

/**
 * This helper generates the "internals" for a tRPC context. If you need to use it, you can export
 * it from here.
 *
 * Examples of things you may need it for:
 * - testing, so we don't have to mock Next.js' req/res
 * - tRPC's `createSSGHelpers`, where we don't have req/res
 *
 * @see https://create.t3.gg/en/usage/trpc#-servertrpccontextts
 */
export const createInnerTRPCContext = (opts: CreateContextOptions) => {
	return {
		session: opts.session,
		wss: opts.wss,
		prisma,
		res: opts.res,
		req: opts.req,
	};
};

/**
 * This is the actual context you will use in your router. It will be used to process every request
 * that goes through your tRPC endpoint.
 *
 * @see https://trpc.io/docs/context
 */
export const createTRPCContext = async (
	opts: Pick<CreateNextContextOptions, "req" | "res"> & SocketServerCtx,
) => {
	const { req, res } = opts;
	const wss = res.socket.server.io;
	// Get the session from the server using the getServerSession wrapper function
	const session = await getServerAuthSession({ req, res });

	return createInnerTRPCContext({
		session,
		wss,
		res,
		req,
	});
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
import {
	initTRPC,
	TRPCError,
	type TRPCDefaultErrorShape,
	type TRPCRootObject,
} from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { NextApiResponse } from "next";

const trpc = initTRPC.context<typeof createTRPCContext>().create({
	transformer: superjson,
	errorFormatter({ shape, error }) {
		return {
			...shape,
			data: {
				...shape.data,
				zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
			},
		};
	},
});

/**
 * tRPC infers the transformer and error shape with `undefined extends ...` checks,
 * which always match while this project compiles without strictNullChecks. That
 * would type every output as plain JSON (Date as string) and drop `zodError`, so
 * the root types are stated explicitly here.
 */
type RootTypes = (typeof trpc)["_config"]["$types"];
type ErrorShape = TRPCDefaultErrorShape & {
	data: TRPCDefaultErrorShape["data"] & {
		zodError: ReturnType<ZodError["flatten"]> | null;
	};
};
const t = trpc as unknown as TRPCRootObject<
	RootTypes["ctx"],
	RootTypes["meta"],
	{ transformer: typeof superjson },
	{
		ctx: RootTypes["ctx"];
		meta: RootTypes["meta"];
		errorShape: ErrorShape;
		transformer: true;
	}
>;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
/**
 * Backstop for every procedure: a user's password hash and two factor secrets
 * never leave the server. Queries are expected to leave those columns out
 * (see USER_SECRET_FIELDS); if one slips through, it is removed here and
 * logged, so a missed `omit` shows up as an error in the log and not as a leak.
 */
const stripUserSecrets = t.middleware(async ({ path, next }) => {
	const result = await next();
	if (!result.ok) return result;

	const data = withoutUserSecrets(result.data);
	if (data === result.data) return result;

	console.error(
		`tRPC ${path} tried to return secret user fields. They were removed, but the query should omit them.`,
	);
	return { ...result, data };
});

const baseProcedure = t.procedure.use(stripUserSecrets);

export const publicProcedure = baseProcedure;

/** Reusable middleware that enforces users are logged in before running the procedure. */
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
	if (!ctx.session || !ctx.session.user) {
		throw new TRPCError({ code: "UNAUTHORIZED" });
	}
	return next({
		ctx: {
			// infers the `session` as non-nullable
			session: { ...ctx.session, user: ctx.session.user },
		},
	});
});

/** Reusable middleware that enforces users have ADMIN role before running the procedure. */
const enforceUserIsAdmin = t.middleware(async ({ ctx, next }) => {
	// Make sure the user is authenticated
	if (!ctx.session || !ctx.session.user) {
		throw new TRPCError({ code: "UNAUTHORIZED" });
	}

	// Check if the user has the ADMIN role
	if (!ctx.session.user || ctx.session.user.role !== "ADMIN") {
		throw new TRPCError({ code: "FORBIDDEN" });
	}

	return next();
});
/**
 * After any successful mutation carrying a network id, push a live "changed"
 * event to that network's Socket.IO room so every open tab refetches at once —
 * without this, other tabs only catch up via the (browser-throttled, ~1/min in
 * background) safety poll. Never fails the mutation if emitting throws.
 */
const emitNetworkChangeOnMutation = t.middleware(
	async ({ ctx, type, getRawInput, next }) => {
		const result = await next();
		if (type === "mutation" && result.ok && ctx.wss) {
			const input = (await getRawInput()) as
				| { nwid?: string; networkId?: string }
				| undefined;
			const nwid = input?.nwid ?? input?.networkId;
			if (nwid) {
				try {
					ctx.wss.to(networkMembersChannel(nwid)).emit(networkMembersChannel(nwid));
				} catch {
					// notification failure must never break the mutation
				}
			}
		}
		return result;
	},
);

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = baseProcedure
	.use(enforceUserIsAuthed)
	.use(emitNetworkChangeOnMutation);

/**
 * Admin Role Protected (authenticated and ADMIN role) procedure
 *
 * If you want a query or mutation to ONLY be accessible to users with the ADMIN role, use this.
 * It verifies the session is valid and guarantees `ctx.session.user` is not null and has the ADMIN role.
 */
export const adminRoleProtectedRoute = baseProcedure.use(enforceUserIsAdmin);
