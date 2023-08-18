import { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import archiver from "archiver";

export default async (_req: NextApiRequest, res: NextApiResponse) => {
	try {
		const folderPath = path.resolve("/var/lib/zerotier-one/zt-mkworld");

		// Check if the directory exists
		if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
			return res.status(404).send("Folder not found.");
		}

		// Create a zip archive using the `archiver` library
		const archive = archiver("zip", {
			zlib: { level: 9 },
		});

		// Catch warnings (e.g. stat failures and other non-blocking errors)
		archive.on("warning", function (err) {
			if (err.code === "ENOENT") {
				console.warn(err);
			} else {
				throw err;
			}
		});

		// Catch any other error
		archive.on("error", function (err) {
			throw err;
		});

		// Set the headers
		res.setHeader("Content-Disposition", "attachment; filename=zt-mkworld.zip");
		res.setHeader("Content-Type", "application/zip");

		// Stream the archive data to the response object
		archive.pipe(res);

		// Append all files from the directory to the zip
		archive.directory(folderPath, false);
		archive.finalize();
	} catch (error) {
		console.error(error);
		res.status(500).send("Internal Server Error.");
	}
};
