import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";
import type { NextApiRequest, NextApiResponse } from "next";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { decryptAndVerifyToken } from "~/utils/encryption";

export default async function createUserHandler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	if (req.method !== "POST") return res.status(405).end(); // Method Not Allowed
	const apiKey = req.headers["x-zt1-auth"] as string;

	try {
		await decryptAndVerifyToken(apiKey);
	} catch (error) {
		return res.status(401).json({ error: error.message });
	}

	// Create context and caller
	const ctx = await createTRPCContext({ req, res });
	const caller = appRouter.createCaller(ctx);

	// get data from the post request
	const { email, password, name, expiresAt } = req.body;

	try {
		const user = await caller.auth.register({
			email: email as string,
			password: password as string,
			name: name as string,
			expiresAt: expiresAt as string,
		});

		return res.status(200).json(user);
	} catch (cause) {
		if (cause instanceof TRPCError) {
			const httpCode = getHTTPStatusCodeFromError(cause);
			try {
				const parsedErrors = JSON.parse(cause.message);
				return res.status(httpCode).json({ cause: parsedErrors });
			} catch (_error) {
				return res.status(httpCode).json({ error: cause.message });
			}
		}
		res.status(500).json({ message: "Internal server error" });
	}
}
