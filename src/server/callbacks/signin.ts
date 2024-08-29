import { ErrorCode } from "~/utils/errorCode";
import { prisma } from "../db";
import { DeviceInfo, parseUA } from "~/utils/devices";
import { isRunningInDocker } from "~/utils/docker";
import { IncomingMessage } from "http";
import { User } from "@prisma/client";
import { sendMailWithTemplate } from "~/utils/mail";
import { MailTemplateKey } from "~/utils/enums";
import { GetServerSidePropsContext } from "next";
import { parse, serialize } from "cookie";
import { createHash, randomBytes } from "crypto";

const DEVICE_SALT_COOKIE_NAME = "next-auth.device_sid";
const SALT_CREATION_DATE_COOKIE_NAME = "next-auth.scd";

async function createUser(userData: User, isOauth = false): Promise<Partial<User>> {
	const userCount = await prisma.user.count();

	// Check if admin has created a default user group for new users
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
				sameSite: "lax",
				path: "/",
			}),
			serialize(SALT_CREATION_DATE_COOKIE_NAME, creationDate.toISOString(), {
				httpOnly: true,
				secure: process.env.NODE_ENV === "production",
				sameSite: "lax",
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
		return match[1];
	}

	return ip;
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
					// check if the oauth user is allowed to sign up.
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

				// update or create device info
				await upsertDeviceInfo(deviceInfo);

				user.deviceId = deviceInfo.deviceId;
				account.deviceId = deviceInfo.deviceId;
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
