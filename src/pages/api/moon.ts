import { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import { ZT_FOLDER } from "~/utils/ztApi";
import archiver from "archiver";

export const config = {
	api: {
		bodyParser: false,
	},
};

export default async (req: NextApiRequest, res: NextApiResponse) => {
	if (req.method !== "GET") {
		return res.status(405).send("Method Not Allowed");
	}

	try {
		const moonPath = path.resolve(ZT_FOLDER, "moon");

		if (!fs.existsSync(moonPath) || !fs.statSync(moonPath).isDirectory()) {
			return res.status(404).send("Moon directory not found.");
		}

		const moonFiles = fs.readdirSync(moonPath);
		const compiledMoonFile = moonFiles.find((file) => file.startsWith("000000"));
		if (!compiledMoonFile) {
			return res.status(404).send("Compiled moon file not found.");
		}

		const compiledMoonPath = path.join(moonPath, compiledMoonFile);
		if (!fs.statSync(compiledMoonPath).isFile()) {
			return res.status(404).send("Compiled moon file is not a valid file.");
		}

		// Create a zip archive
		const archive = archiver("zip", {
			zlib: { level: 9 }, // Sets the compression level.
		});

		// Set the headers
		res.setHeader("Content-Disposition", "attachment; filename=moon_package.zip");
		res.setHeader("Content-Type", "application/zip");

		// Pipe archive data to the response
		archive.pipe(res);

		// Add moon file to the archive
		archive.file(compiledMoonPath, { name: compiledMoonFile });

		// Create and add README file
		const readmeContent = `
    How to Use the Moon File
    
    There are two ways to add this moon to your ZeroTier nodes:
    
    Method 1: Using the moon file
    
    1. Place the moon file (${compiledMoonFile}) in your ZeroTier directory:
       - On Linux/macOS: /var/lib/zerotier-one/moons.d/
       - On Windows: C:\\ProgramData\\ZeroTier\\One\\moons.d\\
    
    2. Restart the ZeroTier service:
       - On Linux: sudo systemctl restart zerotier-one
       - On macOS: sudo launchctl stop com.zerotier.one && sudo launchctl start com.zerotier.one
       - On Windows: Restart the ZeroTier One service in the Services application
    
    Method 2: Using the zerotier-cli orbit command
    
    1. Use the following command on each node where you want to add the moon:
       zerotier-cli orbit <moon_id> <moon_id>
    
       Replace <moon_id> with the 10-digit ID of your moon (the part after '000000' in the filename).
       For example, if the moon file is named '000000deadbeef00.moon', the command would be:
       zerotier-cli orbit deadbeef00 deadbeef00
    
       This command will contact the root and obtain the full world definition from it if it's online and reachable.
    
    Verifying the moon:
    
    To verify that the moon has been added, use the following command:
    zerotier-cli listmoons
    
    Remember, moons operate alongside ZeroTier's default root servers. They can improve performance and provide continuity if the default roots are unreachable, but they don't make your network private.
    
    For more detailed information, visit: https://docs.zerotier.com/zerotier/moons
    `;

		archive.append(readmeContent, { name: "README.txt" });

		// Finalize the archive and send the response
		await archive.finalize();
	} catch (error) {
		console.error(error);
		res.status(500).send("Internal Server Error.");
	}
};
