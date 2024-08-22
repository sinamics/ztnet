import UAParser from "ua-parser-js";

export function generateDeviceId(userAgent: string, userId: string): string {
	const ua = new UAParser(userAgent);
	const deviceType = ua.getDevice().type || "desktop";
	const browser = ua.getBrowser().name || "Unknown";
	const os = ua.getOS().name || "Unknown";
	const version = ua.getOS().version || "Unknown";

	const deviceInfo = `${userId}-${deviceType}-${browser}-${os}-${version}`;

	let hash = 0;
	for (let i = 0; i < deviceInfo.length; i++) {
		const char = deviceInfo.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash;
	}

	return Math.abs(hash).toString(16);
}
