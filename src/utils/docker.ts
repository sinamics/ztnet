import fs from "fs";

export const isRunningInDocker = () => {
	try {
		return (
			fs.readFileSync("/proc/1/cgroup", "utf8").includes("docker") ||
			fs.existsSync("/.dockerenv")
		);
	} catch (_e) {
		return false;
	}
};
