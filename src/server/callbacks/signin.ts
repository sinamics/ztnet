import { ErrorCode } from "~/utils/errorCode";
import { prisma } from "../db";
import { parseUA } from "~/utils/devices";
import { isRunningInDocker } from "~/utils/docker";
import { IncomingMessage } from "http";
import { User } from "@prisma/client";
import { sendMailWithTemplate } from "~/utils/mail";
import { MailTemplateKey } from "~/utils/enums";
import { GetServerSidePropsContext } from "next";
import { parse, serialize } from "cookie";
import { createHash, randomBytes } from "crypto";

interface DeviceInfo {
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

const DEVICE_SALT_COOKIE_NAME = "next-auth.device_sid";
const SALT_CREATION_DATE_COOKIE_NAME = "next-auth.scd";
const DEVICE_SALT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 5;

async function createUser(userData: User, isOauth = false): Promise<Partial<User>> {
	const userCount = await prisma.user.count();
	const defaultUserGroup = await prisma.userGroup.findFirst({
		where: { isDefault: true },
	});
	const currentDate = new Date().toISOString();
	return await prisma.user.create({
		data: {
			name: userData.name,
			email: userData.email,
			lastLogin: currentDate,
			emailVerified: isOauth ? currentDate : null,
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

async function upsertDeviceInfo(deviceInfo: DeviceInfo): Promise<void> {
	const hasDevice = await prisma.userDevice.findUnique({
		where: { deviceId: deviceInfo.deviceId },
		select: { ipAddress: true, createdAt: true },
	});

	const hasIpAddressChanged = hasDevice?.ipAddress !== deviceInfo.ipAddress;
	const hasSaltChanged =
		hasDevice && hasDevice.createdAt.getTime() !== deviceInfo.createdAt.getTime();

	if (hasSaltChanged) {
		// Treat as a new device if salt has changed
		await prisma.userDevice.create({ data: deviceInfo });
	} else {
		await prisma.userDevice.upsert({
			where: { deviceId: deviceInfo.deviceId },
			update: {
				lastActive: deviceInfo.lastActive,
				ipAddress: deviceInfo.ipAddress,
				isActive: true,
			},
			create: deviceInfo,
		});
	}

	const user = await prisma.user.findUnique({
		where: { id: deviceInfo.userId },
		select: { email: true, name: true, id: true, firstTime: true },
	});

	if (user && !user.firstTime) {
		try {
			if (hasIpAddressChanged && hasDevice) {
				sendMailWithTemplate(MailTemplateKey.DeviceIpChangeNotification, {
					to: user.email,
					userId: user.id,
					templateData: {
						toEmail: user.email,
						accessTime: deviceInfo.lastActive.toISOString(),
						ipAddress: deviceInfo.ipAddress,
						browserInfo: deviceInfo.userAgent,
						accountPageUrl: `${process.env.NEXTAUTH_URL}/user-settings/?tab=account`,
					},
				});
			} else if (!hasDevice || hasSaltChanged) {
				// Send email about new device
				sendMailWithTemplate(MailTemplateKey.NewDeviceNotification, {
					to: user.email,
					userId: user.id,
					templateData: {
						accessTime: deviceInfo.lastActive.toISOString(),
						ipAddress: deviceInfo.ipAddress,
						browserInfo: deviceInfo.userAgent,
						accountPageUrl: `${process.env.NEXTAUTH_URL}/user-settings/?tab=account`,
					},
				});
			}
		} catch (error) {
			console.error(`Device Error: ${error}`);
		}
	}
}
function getOrCreateDeviceSalt(
	request: IncomingMessage,
	response: GetServerSidePropsContext["res"],
): { salt: string; creationDate: Date } {
	const cookies = parse(request.headers.cookie || "");
	let salt = cookies[DEVICE_SALT_COOKIE_NAME];
	let creationDate = new Date(cookies[SALT_CREATION_DATE_COOKIE_NAME] || "");

	if (!salt || Number.isNaN(creationDate.getTime())) {
		salt = randomBytes(8).toString("hex");
		creationDate = new Date();

		response.setHeader("Set-Cookie", [
			serialize(DEVICE_SALT_COOKIE_NAME, salt, {
				httpOnly: true,
				secure: process.env.NODE_ENV === "production",
				maxAge: DEVICE_SALT_COOKIE_MAX_AGE,
				sameSite: "strict",
				path: "/",
			}),
			serialize(SALT_CREATION_DATE_COOKIE_NAME, creationDate.toISOString(), {
				httpOnly: true,
				secure: process.env.NODE_ENV === "production",
				maxAge: DEVICE_SALT_COOKIE_MAX_AGE,
				sameSite: "strict",
				path: "/",
			}),
		]);
	}

	return { salt, creationDate };
}
function createDeviceInfo(
	userAgent: string,
	userId: string,
	request: IncomingMessage,
	response: GetServerSidePropsContext["res"],
): DeviceInfo {
	const ipAddress = getIpAddress(request);
	const { salt, creationDate } = getOrCreateDeviceSalt(request, response);
	const parsedUA = parseUA(userAgent);
	// const parsedDeviceId = generateDeviceId(parsedUA, userId);

	const uniqueIdentifier = `|${salt}|${creationDate.toISOString()}`;
	const deviceId = createHash("sha256").update(uniqueIdentifier).digest("hex");

	return {
		...parsedUA,
		userAgent,
		deviceId: deviceId,
		ipAddress,
		userId,
		lastActive: new Date(),
		createdAt: creationDate,
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

async function validateDeviceId(
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

export function signInCallback(
	request: IncomingMessage & { cookies: Partial<{ [key: string]: string }> },
	response: GetServerSidePropsContext["res"],
) {
	return async function signIn({ user, account }) {
		try {
			let userExist = await prisma.user.findUnique({ where: { email: user.email } });
			if (account.provider === "credentials") {
				if (!userExist) {
					return false;
				}
			}

			if (account.provider === "oauth") {
				if (!userExist) {
					const siteSettings = await prisma.globalOptions.findFirst();
					if (!siteSettings?.enableRegistration) {
						return `/auth/login?error=${ErrorCode.RegistrationDisabled}`;
					}
					const emailIsValid = true;
					userExist = (await createUser(user, emailIsValid)) as User;
				}
			}

			if (!userExist) {
				return false;
			}

			const userAgent =
				account.provider === "credentials"
					? user?.userAgent
					: request.headers["user-agent"];

			if (userAgent) {
				const deviceInfo = createDeviceInfo(
					userAgent as string,
					userExist.id,
					request,
					response,
				);

				const isValidDevice = await validateDeviceId(deviceInfo, userExist.id);
				if (!isValidDevice) {
					return false;
				}
				// Treat as a new device login
				await upsertDeviceInfo(deviceInfo);

				user.deviceId = deviceInfo.deviceId;
			}

			await prisma.user.update({
				where: { id: userExist.id },
				data: { lastLogin: new Date().toISOString(), firstTime: false },
			});
			return true;
		} catch (error) {
			console.error("Error in signIn callback:", error);
			return false;
		}
	};
}
