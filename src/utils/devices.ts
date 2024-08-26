import UAParser from "ua-parser-js";
export interface ParsedUA {
	deviceType: string;
	browser: string;
	browserVersion: string;
	os: string;
	osVersion: string;
}

interface ReturnDeviceId {
	deviceId: string;
	parsedUA: ParsedUA;
}
export function generateDeviceId(parsedUA: ParsedUA, userId: string): ReturnDeviceId {
	const deviceInfoString = `${userId}-${parsedUA.deviceType}-${parsedUA.browser}-${parsedUA.browserVersion}-${parsedUA.os}-${parsedUA.osVersion}`;
	let hash = 0;
	for (let i = 0; i < deviceInfoString.length; i++) {
		const char = deviceInfoString.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash;
	}

	return {
		deviceId: Math.abs(hash).toString(16),
		parsedUA,
	};
}

export function parseUA(userAgent: string): ParsedUA {
	const ua = new UAParser(userAgent);

	return {
		deviceType: ua.getDevice().type || "desktop",
		browser: ua.getBrowser().name || "Unknown",
		browserVersion: ua.getBrowser().version || "Unknown",
		os: ua.getOS().name || "Unknown",
		osVersion: ua.getOS().version || "Unknown",
	};
}
