import { NextApiRequest, NextApiResponse } from "next";
import { deleteDeviceCookie } from "~/utils/devices";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method === "POST") {
		// Set the cookie with an expiration date in the past
		deleteDeviceCookie(res);

		res.status(200).json({ message: "Device cookie deleted" });
	} else {
		res.status(405).end(`Method ${req.method} Not Allowed`);
	}
}
