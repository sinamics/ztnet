import fs from "fs";

interface LocalConf {
	settings?: {
		primaryPort?: number;
	};
}

/*
 *
 * Update local.conf file with the new port number
 *
 */
const zerotierOneDir = "/var/lib/zerotier-one";
export const updateLocalConf = (portNumber: number): Promise<boolean> => {
	return new Promise((resolve, reject) => {
		const localConfPath = `${zerotierOneDir}/local.conf`;
		let localConf: LocalConf;

		try {
			const localConfContent = fs.readFileSync(localConfPath, "utf8");
			localConf = localConfContent ? JSON.parse(localConfContent) : null;
		} catch (err) {
			if (err.code === "ENOENT") {
				localConf = {
					settings: {
						primaryPort: 9993,
					},
				};
			} else {
				reject(`Error reading zerotier-one/local.conf: ${err.message}`);
				return;
			}
		}
		if (
			localConf?.settings &&
			"primaryPort" in localConf.settings &&
			portNumber
		) {
			localConf.settings.primaryPort = portNumber;
			fs.writeFileSync(localConfPath, JSON.stringify(localConf, null, 2));
			resolve(true);
		} else {
			reject(
				'Error: "primaryPort" key does not exist in zerotier-one/local.conf file',
			);
		}
	});
};
