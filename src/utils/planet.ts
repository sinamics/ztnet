import fs from "fs";

interface LocalConf {
	settings?: {
		primaryPort?: number;
		secondaryPort?: number;
		allowSecondaryPort?: boolean;
	};
}

/*
 *
 * Update local.conf file with the new port number
 *
 */
const zerotierOneDir = "/var/lib/zerotier-one";
export const updateLocalConf = (portNumbers: number[]): Promise<boolean> => {
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
		if (localConf?.settings && "primaryPort" in localConf.settings && portNumbers) {
			localConf.settings.primaryPort = portNumbers[0];

			if (portNumbers.length > 1) {
				localConf.settings.secondaryPort = portNumbers[1];
				localConf.settings.allowSecondaryPort = true;
			} else {
				// remove the secondaryPort and allowSecondaryPort keys from local.conf
				// rome-ignore lint/correctness/noUnusedVariables: <explanation>
				const { secondaryPort, allowSecondaryPort, ...restSettings } = localConf.settings;
				localConf.settings = restSettings;
			}
			fs.writeFileSync(localConfPath, JSON.stringify(localConf, null, 2));
			resolve(true);
		} else {
			reject('Error: "primaryPort" key does not exist in zerotier-one/local.conf file');
		}
	});
};
