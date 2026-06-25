import { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import { prisma } from "~/server/db";
import { AuthorizationType } from "~/types/apiTypes";
import { decryptAndVerifyToken } from "~/utils/encryption";
import { ZT_FOLDER } from "~/utils/ztApi";

export const config = {
	api: {
		bodyParser: false,
	},
};

export default async (req: NextApiRequest, res: NextApiResponse) => {
	if (req.method === "GET") {
		try {
			const options = await prisma.globalOptions.findFirst({
				where: { id: 1 },
				select: { planetDownloadAuthMode: true },
			});
			if (options?.planetDownloadAuthMode === "REST_API") {
				const header = req.headers["x-ztnet-auth"];
				const apiKey = Array.isArray(header) ? header[0] : header;
				if (!apiKey) {
					return res.status(401).send("API token is required.");
				}
				try {
					await decryptAndVerifyToken({
						apiKey,
						apiAuthorizationType: AuthorizationType.PERSONAL,
						requireAdmin: true,
					});
				} catch {
					return res.status(401).send("Invalid API token.");
				}
			}

			const folderPath = path.resolve(`${ZT_FOLDER}/zt-mkworld`);
			const filePath = path.join(folderPath, "planet.custom");

			// Check if the directory and file exist
			if (
				!fs.existsSync(folderPath) ||
				!fs.statSync(folderPath).isDirectory() ||
				!fs.existsSync(filePath)
			) {
				return res.status(404).send("Folder or file not found.");
			}

			// Read the file and stream it to the response
			const fileStream = fs.createReadStream(filePath);

			// Set the headers
			res.setHeader("Content-Disposition", "attachment; filename=planet.custom");
			res.setHeader("Content-Type", "application/octet-stream");

			// Pipe the read stream to the response
			fileStream.pipe(res);
		} catch (error) {
			console.error(error);
			res.status(500).send("Internal Server Error.");
		}
	} else {
		res.status(405).send("Method Not Allowed"); // Handle unsupported HTTP methods
	}
};
