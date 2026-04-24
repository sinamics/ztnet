import { auth } from "./auth";
import { fromNodeHeaders } from "better-auth/node";
import type { IncomingMessage } from "http";
import type { GetServerSidePropsContext } from "next";
import type { Session } from "./authTypes";

/**
 * Get the server-side session. Drop-in replacement for next-auth's getServerAuthSession.
 * Works with both getServerSideProps context and raw req/res pairs.
 *
 * Returns a serialized session (Dates converted to strings) for getServerSideProps compatibility.
 * (skill guide lesson #6)
 */
export async function getServerAuthSession(ctx: {
	req: GetServerSidePropsContext["req"] | IncomingMessage;
	res?: GetServerSidePropsContext["res"];
}): Promise<Session | null> {
	const session = await auth.api.getSession({
		headers: fromNodeHeaders(ctx.req.headers),
	});

	if (!session) return null;

	// Normalize to the shape the app expects: { user, expires }
	return JSON.parse(
		JSON.stringify({
			user: session.user,
			expires: session.session.expiresAt,
		}),
	);
}
