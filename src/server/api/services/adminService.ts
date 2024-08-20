import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { ZT_FOLDER } from "~/utils/ztApi";

export interface RootNode {
	endpoints?: string[];
	comments?: string;
	identity?: string;
	isMoon?: boolean;
}

export async function createMoon(nodes: RootNode[], moonPath: string) {
	const identityPath = `${ZT_FOLDER}/identity.secret`;
	const publicIdentityPath = `${ZT_FOLDER}/identity.public`;
	const ZT_IDTOOL = "/usr/local/bin/zerotier-idtool";

	// Generate moon identity if it doesn't exist
	if (!fs.existsSync(identityPath) || !fs.existsSync(publicIdentityPath)) {
		execSync(`${ZT_IDTOOL} generate ${identityPath} ${publicIdentityPath}`);
	}

	const currentControllerId = fs
		.readFileSync(publicIdentityPath, "utf-8")
		.trim()
		.split(":")[0];

	// Filter nodes that are marked as moons
	const moonNodes = nodes.filter((node) => node.isMoon);

	const moonConfig = {
		id: currentControllerId,
		roots: moonNodes.map((node) => ({
			identity: node.identity,
			endpoints: node.endpoints,
		})),
	};

	// Generate the initial moon file
	const initMoonFilePath = `${moonPath}/initmoon_${currentControllerId}.json`;
	execSync(`${ZT_IDTOOL} initmoon ${identityPath} > ${initMoonFilePath}`);

	// Read the initmoon.json file
	const initMoonConfig = JSON.parse(fs.readFileSync(initMoonFilePath, "utf-8"));

	// Merge the roots from moonConfig into initMoonConfig
	initMoonConfig.roots = moonConfig.roots.map((root) => ({
		identity: root.identity,
		stableEndpoints: root.endpoints,
	}));

	// Write the updated config back to initmoon.json
	fs.writeFileSync(initMoonFilePath, JSON.stringify(initMoonConfig, null, 4));

	// Generate the final moon file
	execSync(`cd ${moonPath} && ${ZT_IDTOOL} genmoon ${initMoonFilePath}`);

	// Check if one of the nodes is the current controller
	const isCurrentControllerMoon = moonNodes.some((node) =>
		node.identity.includes(currentControllerId),
	);
	if (isCurrentControllerMoon) {
		// Find the generated moon file
		const moonFiles = fs.readdirSync(moonPath);
		const generatedMoonFile = moonFiles.find(
			(file) => file.startsWith("000000") && file.endsWith(".moon"),
		);

		if (generatedMoonFile) {
			const sourcePath = path.join(moonPath, generatedMoonFile);
			const destPath = path.join(ZT_FOLDER, "moons.d", generatedMoonFile);

			// Ensure the moons.d directory exists
			const moonsDirPath = path.join(ZT_FOLDER, "moons.d");
			if (!fs.existsSync(moonsDirPath)) {
				fs.mkdirSync(moonsDirPath, { recursive: true });
			}

			// Copy the moon file to the moons.d folder
			fs.copyFileSync(sourcePath, destPath);
		} else {
			console.error("Generated moon file not found");
		}
	}

	return currentControllerId;
}
