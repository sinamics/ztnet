import { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import { promises as fsPromises } from "fs";
import { prisma } from "~/server/db";
import fs from "fs";
import path from "path";
import unzipper from "unzipper";
import { PassThrough } from "stream";
import { execSync } from "child_process";

export const config = {
	api: {
		bodyParser: false,
	},
};

export default (req: NextApiRequest, res: NextApiResponse) => {
	return new Promise<void>((resolve, reject) => {
		if (req.method !== "POST") {
			res.status(405).json({ error: "Method Not Allowed" });
			return resolve();
		}
		const zerotierOneDir = "/var/lib/zerotier-one";
		const mkworldDir = `${zerotierOneDir}/zt-mkworld`;
		const ztmkworldBinPath = "/usr/local/bin/ztmkworld";
		const planetPath = `${zerotierOneDir}/planet`;
		const backupDir = `${zerotierOneDir}/planet_backup`;

		const form = formidable({
			uploadDir: "/tmp",
			keepExtensions: true,
		});

		form.parse(req, async (err, _fields, files) => {
			if (err) {
				console.error("Error parsing the form:", err);
				res.status(500).json({ error: "Error parsing the form." });
				return resolve();
			}

			const uploadedFilePath = files?.file[0]?.filepath;
			if (!uploadedFilePath) {
				res.status(400).json({ error: "No file uploaded." });
				return resolve();
			}

			try {
				await fsPromises.mkdir(mkworldDir, { recursive: true });

				const requiredFiles = ["mkworld.config.json"];
				const optionalFiles = [
					"current.c25519",
					"previous.c25519",
					"planet.custom",
				];
				const foundFiles = [];

				fs.createReadStream(uploadedFilePath)
					.pipe(unzipper.Parse())
					.on("entry", function (entry) {
						const fileName = entry.path;
						let jsonContent = "";

						if (
							requiredFiles.includes(fileName) ||
							optionalFiles.includes(fileName)
						) {
							foundFiles.push(fileName);
							if (fileName === "mkworld.config.json") {
								const pass = new PassThrough();

								entry
									.pipe(pass)
									.on("data", (chunk) => {
										jsonContent += chunk;
									})
									.on("end", async () => {
										try {
											const parsedContent = JSON.parse(jsonContent);
											await prisma.globalOptions.update({
												where: { id: 1 },
												data: {
													customPlanetUsed: true,
													plBirth: parsedContent?.plBirth,
													plID: parsedContent?.plID,
													plRecommend: parsedContent?.plRecommend,
													plComment: parsedContent?.rootNodes?.[0]?.comments,
													plIdentity: parsedContent?.rootNodes?.[0]?.identity,
													plEndpoints:
														parsedContent?.rootNodes?.[0]?.endpoints.join(","),
												},
											});

											prisma.$disconnect();
										} catch (e) {
											console.error("Error parsing mkworld.config.json:", e);
											res.status(400).json({
												error: "Error parsing mkworld.config.json",
											});
										}
									});

								pass.pipe(
									fs.createWriteStream(path.join(mkworldDir, fileName)),
								);
							} else {
								// Extract other files to the target directory
								entry.pipe(
									fs.createWriteStream(path.join(mkworldDir, fileName)),
								);
							}
						} else {
							entry.autodrain();
						}
					})
					.on("close", async function () {
						if (requiredFiles.every((file) => foundFiles.includes(file))) {
							try {
								// Backup existing planet file if it exists
								if (fs.existsSync(planetPath)) {
									// we only backup the orginal planet file once
									if (!fs.existsSync(backupDir)) {
										fs.mkdirSync(backupDir);

										const timestamp = new Date()
											.toISOString()
											.replace(/[^a-zA-Z0-9]/g, "_");
										fs.copyFileSync(
											planetPath,
											`${backupDir}/planet.bak.${timestamp}`,
										);
									}
								}
								execSync(
									`cd ${mkworldDir} && ${ztmkworldBinPath} -c ${mkworldDir}/mkworld.config.json`,
								);

								// Copy generated planet file
								fs.copyFileSync(`${mkworldDir}/planet.custom`, planetPath);
							} catch (e) {
								console.error("Error running ztmkworld:", e);
								res.status(400).json({
									error: "Error running ztmkworld",
								});
								return resolve();
							}

							res
								.status(200)
								.json({ message: "File uploaded and extracted successfully." });
							resolve();
						} else {
							const missingFiles = requiredFiles.filter(
								(file) => !foundFiles.includes(file),
							);
							console.error("Missing required files in the zip:", missingFiles);
							res.status(400).json({
								error: "Missing required files in the zip.",
								files: missingFiles,
							});
							resolve();
						}
					});
			} catch (error) {
				console.error("Error processing the uploaded file:", error);
				res.status(500).json({ error: "Internal Server Error." });
				reject();
			}
		});
	});
};
