import type { NextApiRequest, NextApiResponse } from "next";
import { authenticator } from "otplib";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "~/server/auth";
import { ErrorCode } from "~/utils/errorCode";
import { prisma } from "~/server/db";
import {
	decrypt,
	generateInstanceSecret,
	TOTP_MFA_TOKEN_SECRET,
} from "~/utils/encryption";
import crypto from "crypto";
import { hash } from "bcryptjs";

function generateRecoveryCodes() {
	const codes = [];
	for (let i = 0; i < 6; i++) {
		const code = crypto.randomBytes(4).toString("hex");
		codes.push(code);
	}
	return codes;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ message: "Method not allowed" });
	}

	const session = await getServerSession(req, res, getAuthOptions(req, res));
	if (!session) {
		return res.status(401).json({ message: "Not authenticated" });
	}

	if (!session.user?.email) {
		console.error("Session is missing a user email.");
		return res.status(500).json({ error: ErrorCode.InternalServerError });
	}

	const user = await prisma.user.findUnique({
		where: { email: session.user.email },
	});

	if (!user) {
		console.error("Session references user that no longer exists.");
		return res.status(401).json({ message: "Not authenticated" });
	}

	if (user.twoFactorEnabled) {
		return res.status(400).json({ error: ErrorCode.TwoFactorAlreadyEnabled });
	}

	if (!user.twoFactorSecret) {
		return res.status(400).json({ error: ErrorCode.TwoFactorSetupRequired });
	}
	if (!process.env.NEXTAUTH_SECRET) {
		console.error("Missing encryption key; cannot proceed with two factor setup.");
		return res.status(500).json({ error: ErrorCode.InternalServerError });
	}

	const secret = decrypt<string>(
		user.twoFactorSecret,
		generateInstanceSecret(TOTP_MFA_TOKEN_SECRET),
	);
	if (secret.length !== 32) {
		console.error(
			`Two factor secret decryption failed. Expected key with length 32 but got ${secret.length}`,
		);
		return res.status(500).json({ error: ErrorCode.InternalServerError });
	}

	const isValidToken = authenticator.check(req.body.totpCode, secret);
	if (!isValidToken) {
		return res.status(400).json({ error: ErrorCode.IncorrectTwoFactorCode });
	}

	const recoveryCodes = generateRecoveryCodes();
	const hashedRecoveryCodes = await Promise.all(
		recoveryCodes.map((code) => hash(code, 10)),
	);

	await prisma.user.update({
		where: { email: session.user.email },
		data: {
			twoFactorEnabled: true,
			twoFactorRecoveryCodes: hashedRecoveryCodes,
		},
	});
	return res.json({ message: "Two-factor enabled", recoveryCodes });
}
