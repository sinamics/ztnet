import { NextApiRequest, NextApiResponse } from "next";
import NextAuth from "next-auth";
import { authOptions } from "~/server/auth";

// export default NextAuth(authOptions);

export default function auth(req: NextApiRequest, res: NextApiResponse) {
	const { host } = req.headers;
	console.log(req.headers);
	return NextAuth(authOptions)(req, res);
}
