import UAParser from "ua-parser-js";
import { prisma } from "~/server/db";
export interface ParsedUA {
	deviceType: string;
	browser: string;
	browserVersion: string;
	os: string;
	osVersion: string;
}

export interface DeviceInfo {
	userAgent: string;
	deviceId: string;
	ipAddress: string;
	userId: string;
	deviceType: string;
	browser: string;
	browserVersion: string;
	os: string;
	osVersion: string;
	lastActive: Date;
	createdAt: Date;
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

export async function validateDeviceId(
	deviceInfo: DeviceInfo,
	userId: string,
): Promise<boolean> {
	const storedDevice = await prisma.userDevice.findUnique({
		where: { deviceId: deviceInfo.deviceId },
	});

	if (!storedDevice) {
		return false;
	}

	if (storedDevice.userId !== userId) {
		return false;
	}

	if (storedDevice.createdAt.getTime() !== deviceInfo.createdAt.getTime()) {
		return false;
	}

	return true;
}
