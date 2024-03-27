// import { NextApiRequest, NextApiResponse } from "next";
import NextAuth from "next-auth";
import { authOptions } from "~/server/auth";

// biome-ignore lint/suspicious/noConsoleLog: <explanation>
console.log("nextauth address: ", process.env.NEXTAUTH_URL);
export default NextAuth(authOptions);

// export default function auth(req: NextApiRequest, res: NextApiResponse) {
// 	return NextAuth(authOptions)(req, res);
// }
