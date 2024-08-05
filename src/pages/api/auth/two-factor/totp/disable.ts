import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authenticator } from "otplib";
import { authOptions } from "~/server/auth";
import { prisma } from "~/server/db";
import {
	decrypt,
	generateInstanceSecret,
	TOTP_MFA_TOKEN_SECRET,
} from "~/utils/encryption";
import { ErrorCode } from "~/utils/errorCode";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ message: "Method not allowed" });
	}

	const session = await getServerSession(req, res, authOptions);
	if (!session) {
		return res.status(401).json({ message: "Not authenticated" });
	}

	if (!session.user?.email) {
		console.error("Session is missing a user id.");
		return res.status(500).json({ error: ErrorCode.InternalServerError });
	}

	const user = await prisma.user.findUnique({
		where: { email: session.user.email },
	});

	if (!user) {
		console.error("Session references user that no longer exists.");
		return res.status(401).json({ message: "Not authenticated" });
	}

	if (!user.hash) {
		return res.status(400).json({ error: ErrorCode.UserMissingPassword });
	}

	if (!user.twoFactorEnabled) {
		return res.json({ message: "Two factor disabled" });
	}

	// if user has 2fa
	if (user.twoFactorEnabled) {
		if (!req.body.totpCode) {
			return res.status(400).json({ error: ErrorCode.SecondFactorRequired });
		}

		if (!user.twoFactorSecret) {
			console.error(
				`Two factor is enabled for user ${user.email} but they have no secret`,
			);
			throw new Error(ErrorCode.InternalServerError);
		}

		if (!process.env.NEXTAUTH_SECRET) {
			console.error(`"Missing encryption key; cannot proceed with two factor login."`);
			throw new Error(ErrorCode.InternalServerError);
		}

		const secret = decrypt<string>(
			user.twoFactorSecret,
			generateInstanceSecret(TOTP_MFA_TOKEN_SECRET),
		);
		if (secret.length !== 32) {
			console.error(
				`Two factor secret decryption failed. Expected key with length 32 but got ${secret.length}`,
			);
			throw new Error(ErrorCode.InternalServerError);
		}

		// If user has 2fa enabled, check if body.totpCode is correct
		const isValidToken = authenticator.check(req.body.totpCode, secret);
		if (!isValidToken) {
			return res.status(400).json({ error: ErrorCode.IncorrectTwoFactorCode });
		}
	}

	// If it is, disable users 2fa
	await prisma.user.update({
		where: { email: user.email },
		data: {
			twoFactorEnabled: false,
			twoFactorSecret: null,
		},
	});

	return res.json({ message: "Two factor disabled" });
}
