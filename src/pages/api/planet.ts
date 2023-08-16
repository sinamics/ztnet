import { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

export default async (_req: NextApiRequest, res: NextApiResponse) => {
	try {
		// Define the path to the planet file
		const filePath = path.resolve("/var/lib/zerotier-one/planet");

		// Check if the file exists
		if (!fs.existsSync(filePath)) {
			return res.status(404).send("File not found.");
		}

		// Read the file
		const fileData = fs.readFileSync(filePath);

		// Set the appropriate headers
		res.setHeader("Content-Disposition", "attachment; filename=planet");
		res.setHeader("Content-Type", "text/plain");

		// Send the file data
		res.send(fileData);
	} catch (error) {
		console.error(error);
		res.status(500).send("Internal Server Error.");
	}
};
