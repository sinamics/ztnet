import { ErrorCode } from "~/utils/errorCode";
import { prisma } from "../db";
import {
	createDeviceCookie,
	DEVICE_SALT_COOKIE_NAME,
	DeviceInfo,
	parseUA,
} from "~/utils/devices";
import { isRunningInDocker } from "~/utils/docker";
import { IncomingMessage } from "http";
import { User } from "@prisma/client";
import { sendMailWithTemplate } from "~/utils/mail";
import { MailTemplateKey } from "~/utils/enums";
import { GetServerSidePropsContext } from "next";
import { parse } from "cookie";
import { randomBytes } from "crypto";

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
	const existingDevice = await prisma.userDevice.findUnique({
		where: { deviceId: deviceInfo.deviceId },
		select: { ipAddress: true },
	});

	await prisma.userDevice.upsert({
		where: { deviceId: deviceInfo.deviceId },
		update: {
			lastActive: deviceInfo.lastActive,
			ipAddress: deviceInfo.ipAddress,
			isActive: true,
		},
		create: deviceInfo,
	});

	const user = await prisma.user.findUnique({
		where: { id: deviceInfo.userId },
		select: { email: true, id: true, firstTime: true },
	});

	try {
		if (user && !user.firstTime) {
			// Send email notification if the device is new or the IP address has changed
			const templateKey = !existingDevice
				? MailTemplateKey.NewDeviceNotification
				: existingDevice.ipAddress !== deviceInfo.ipAddress
					? MailTemplateKey.DeviceIpChangeNotification
					: null;

			if (templateKey) {
				await sendMailWithTemplate(templateKey, {
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
			}
		}
	} catch (_e) {
		console.error(
			"Failed to send email notification for new device, check your mail settings.",
		);
	}
}

function getOrCreateDeviceSalt(
	request: IncomingMessage,
	response: GetServerSidePropsContext["res"],
): string {
	const cookies = parse(request.headers.cookie || "");
	let deviceId = cookies[DEVICE_SALT_COOKIE_NAME];

	if (!deviceId) {
		deviceId = randomBytes(16).toString("hex");
		createDeviceCookie(response, deviceId);
	}

	return deviceId;
}

function createDeviceInfo(
	userAgent: string,
	userId: string,
	request: IncomingMessage,
	response: GetServerSidePropsContext["res"],
): DeviceInfo {
	const deviceId = getOrCreateDeviceSalt(request, response);

	return {
		...parseUA(userAgent),
		userAgent,
		deviceId,
		ipAddress: getIpAddress(request),
		userId,
		lastActive: new Date(),
	};
}

function getIpAddress(req: IncomingMessage): string {
	const forwardedFor = req.headers["x-forwarded-for"];
	const ip = forwardedFor
		? (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(",")[0]).trim()
		: req.socket.remoteAddress || "Unknown";
	return ip.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/)?.[1] || ip;
}

export function signInCallback(
	request: IncomingMessage & { cookies: Partial<{ [key: string]: string }> },
	response: GetServerSidePropsContext["res"],
) {
	return async function signIn({ user, account, profile }) {
		try {
			let userExist = await prisma.user.findUnique({ where: { email: user.email } });

			if (account.provider === "credentials") {
				if (!userExist) {
					return false;
				}
			}

			if (account.provider === "oauth") {
				if (!userExist) {
					// Check if OAuth allows new users
					const oauthAllowNewUsers = process.env.OAUTH_ALLOW_NEW_USERS !== "false";
					const oauthExclusiveLogin = process.env.OAUTH_EXCLUSIVE_LOGIN === "true";

					// If OAuth exclusive login is enabled, allow new users based on OAUTH_ALLOW_NEW_USERS
					// Otherwise, check the general registration setting
					const canCreateUser = oauthExclusiveLogin
						? oauthAllowNewUsers
						: (await prisma.globalOptions.findFirst())?.enableRegistration;

					if (!canCreateUser) {
						return `/auth/login?error=${ErrorCode.RegistrationDisabled}`;
					}

					const emailIsValid = true;
					userExist = (await createUser(user, emailIsValid)) as User;
				}
			}

			if (!userExist) return false;

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

				// set the device id, we will use it in the jwt callback
				user.deviceId = deviceInfo.deviceId;
				if (account.provider === "oauth") {
					profile.deviceId = deviceInfo.deviceId;
				}
			}

			await prisma.user.update({
				where: { id: userExist.id },
				data: { lastLogin: new Date().toISOString(), firstTime: false },
			});

			// console.log(user);
			return true;
		} catch (error) {
			console.error("Error in signIn callback:", error);
			return false;
		}
	};
}
