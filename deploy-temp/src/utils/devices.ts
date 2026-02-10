import { serialize } from "cookie";
import { GetServerSidePropsContext } from "next";
import UAParser from "ua-parser-js";
import { prisma } from "~/server/db";

export const DEVICE_SALT_COOKIE_NAME = "next-auth.did-token";
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

	return true;
}

/**
 * Creates a user device cookie.
 *
 * @param res - The server response object.
 * @param deviceId - The device ID.
 */
export const createDeviceCookie = (
	res: GetServerSidePropsContext["res"],
	deviceId: string,
) => {
	try {
		res.setHeader("Set-Cookie", [
			serialize(DEVICE_SALT_COOKIE_NAME, deviceId, {
				httpOnly: true,
				secure: false,
				sameSite: "lax",
				maxAge: 1 * 365 * 24 * 60 * 60, // 1 year
				expires: new Date(Date.now() + 1 * 365 * 24 * 60 * 60 * 1000), // 1 year
				path: "/",
			}),
		]);
	} catch (error) {
		console.error("Error creating device cookie:", error);
	}
};

/**
 * Deletes or invalidates the user device cookie.
 *
 * @param res - The server response object.
 * @param deviceId - The ID of the device to delete the cookie for.
 */
export const deleteDeviceCookie = (res: GetServerSidePropsContext["res"]) => {
	try {
		res.setHeader("Set-Cookie", [
			serialize(DEVICE_SALT_COOKIE_NAME, "", {
				httpOnly: true,
				secure: false,
				sameSite: "lax",
				maxAge: -1,
				expires: new Date(0),
				path: "/",
			}),
		]);
	} catch (error) {
		console.error("Error deleting device cookie:", error);
	}
};
