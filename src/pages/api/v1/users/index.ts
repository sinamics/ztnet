import type { NextApiRequest, NextApiResponse } from "next";

const verifyApiKey = (key: string): boolean => {
	return key === "secret";
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
	const apiKey = req.headers["x-zt1-auth"] as string;

	if (!apiKey || !verifyApiKey(apiKey)) {
		return res.status(401).json({ error: "Unauthorized" });
	}

	const { networkID } = req.query;
	if (req.method === "GET") {
		if (networkID) {
			// Get specific network
		} else {
			// Get list of networks
		}
		res.status(200).json({ status: "ok" });
	} else if (req.method === "POST") {
		// Create a new network
		res.status(201).json({
			/* ... */
		});
	} else if (req.method === "DELETE") {
		// Delete a specific network
		res.status(204).end();
	} else {
		res.status(405).end(); // Method Not Allowed
	}
}
