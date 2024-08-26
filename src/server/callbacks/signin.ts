import { ErrorCode } from "~/utils/errorCode";
import { prisma } from "../db";
import { generateDeviceId } from "~/utils/devices";
import UAParser from "ua-parser-js";
import { isRunningInDocker } from "~/utils/docker";
import { IncomingMessage } from "http";
import { User } from "@prisma/client";

interface DeviceInfo {
	deviceId: string;
	ipAddress: string;
	userId: string;
	deviceType: string;
	browser: string;
	os: string;
	lastActive: Date;
}

async function findUser(email: string): Promise<User | null> {
	return prisma.user.findUnique({ where: { email } });
}

async function createUser(userData: User): Promise<Partial<User>> {
	const userCount = await prisma.user.count();
	const defaultUserGroup = await prisma.userGroup.findFirst({
		where: { isDefault: true },
	});

	return await prisma.user.create({
		data: {
			name: userData.name,
			email: userData.email,
			lastLogin: new Date().toISOString(),
			role: userCount === 0 ? "ADMIN" : "USER",
			image: userData.image,
			userGroupId: defaultUserGroup?.id,
			options: {
				create: {
					localControllerUrl: isRunningInDocker()
						? "http://zerotier:9993"
						: "http://127.0.0.1:9993",
				},
			},
		},
		select: {
			id: true,
			name: true,
			email: true,
			role: true,
		},
	});
}

async function updateUserLogin(userId: string): Promise<void> {
	await prisma.user.update({
		where: { id: userId },
		data: { lastLogin: new Date().toISOString() },
	});
}

async function upsertDeviceInfo(
	deviceInfo: DeviceInfo,
	ipAddress: string,
): Promise<void> {
	await prisma.userDevice.upsert({
		where: { deviceId: deviceInfo.deviceId },
		update: {
			lastActive: deviceInfo.lastActive,
			ipAddress,
			isActive: true,
		},
		create: deviceInfo,
	});
}

function createDeviceInfo(
	userAgent: string,
	userId: string,
	ipAddress: string,
): DeviceInfo {
	const deviceId = generateDeviceId(userAgent, userId);
	const ua = new UAParser(userAgent);

	return {
		deviceId,
		ipAddress,
		userId,
		deviceType: ua.getDevice().type || "desktop",
		browser: ua.getBrowser().name || "Unknown",
		os: ua.getOS().name || "Unknown",
		lastActive: new Date(),
	};
}

function getIpAddress(req: IncomingMessage): string {
	const forwardedFor = req.headers["x-forwarded-for"];

	if (forwardedFor) {
		// If there are multiple IP addresses, take the first one
		const ips = Array.isArray(forwardedFor)
			? forwardedFor[0]
			: forwardedFor.split(",")[0];
		return extractIpv4(ips.trim());
	}

	// If x-forwarded-for is not available, use the remote address
	const remoteAddress = req.socket.remoteAddress || "Unknown";
	return extractIpv4(remoteAddress);
}

function extractIpv4(ip: string): string {
	// Check if it's an IPv4-mapped IPv6 address
	const ipv4Regex = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/;
	const match = ip.match(ipv4Regex);

	if (match) {
		return match[1]; // Return the extracted IPv4 address
	}

	return ip; // Return the original IP if it's not an IPv4-mapped IPv6 address
}

export function signInCallback(
	req: IncomingMessage & { cookies: Partial<{ [key: string]: string }> },
) {
	return async function signIn({ user, account }) {
		try {
			const ipAddress = getIpAddress(req);
			let existingUser = await findUser(user.email);
			if (account.provider === "credentials") {
				if (!existingUser) {
					// For credentials, we don't create a new user if they don't exist
					return false;
				}
			}

			if (account.provider === "oauth") {
				if (!existingUser) {
					// For OAuth, we create a new user if they don't exist
					const siteSettings = await prisma.globalOptions.findFirst();
					if (!siteSettings?.enableRegistration) {
						return `/auth/login?error=${ErrorCode.RegistrationDisabled}`;
					}
					existingUser = (await createUser(user)) as User;
				}
			}

			if (!existingUser) {
				return false;
			}

			await updateUserLogin(existingUser.id);

			const userAgent =
				account.provider === "credentials" ? user?.userAgent : req.headers["user-agent"];

			if (userAgent) {
				const deviceInfo = createDeviceInfo(
					userAgent as string,
					existingUser.id,
					ipAddress,
				);
				await upsertDeviceInfo(deviceInfo, ipAddress);
				user.deviceId = deviceInfo.deviceId;
			}

			return true;
		} catch (error) {
			console.error("Error in signIn callback:", error);
			return false;
		}
	};
}
