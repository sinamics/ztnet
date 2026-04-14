import { toNodeHandler } from "better-auth/node";
import { auth } from "~/lib/auth";
import type { NextApiRequest, NextApiResponse } from "next";

// better-auth handles its own body parsing
export const config = {
	api: {
		bodyParser: false,
	},
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	return toNodeHandler(auth)(req, res);
}
