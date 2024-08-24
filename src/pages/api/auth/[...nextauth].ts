import type { NextApiRequest, NextApiResponse } from "next";
import NextAuth from "next-auth";
import { getAuthOptions } from "~/server/auth";

export default async function auth(req: NextApiRequest, res: NextApiResponse) {
	const authOptions = getAuthOptions(req);

	return await NextAuth(req, res, authOptions);
}
