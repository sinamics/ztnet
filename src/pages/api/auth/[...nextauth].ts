import { NextApiRequest, NextApiResponse } from "next";
import NextAuth from "next-auth";
import { authOptions } from "~/server/auth";

export default function auth(req: NextApiRequest, res: NextApiResponse) {
	const { host } = req.headers;
	if (host && !!process.env.AUTH_TRUST_HOST) {
		process.env.NEXTAUTH_URL = /localhost/.test(host || "") ? `http://${host}` : host;
	}
	return NextAuth(authOptions)(req, res);
}
