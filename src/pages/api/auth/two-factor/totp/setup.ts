import type { NextApiRequest, NextApiResponse } from "next";
import { authenticator } from "otplib";
import qrcode from "qrcode";
import { prisma } from "~/server/db";
import { compare } from "bcryptjs";
import { ErrorCode } from "~/utils/errorCode";
import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "~/server/auth";
import {
	encrypt,
	generateInstanceSecret,
	TOTP_MFA_TOKEN_SECRET,
} from "~/utils/encryption";

function generateOTPAuthURL(
	name: string,
	secret: string,
	issuer: string,
	logoUrl: string,
) {
	const keyUri = authenticator.keyuri(name, issuer, secret);
	return `${keyUri}&image=${encodeURIComponent(logoUrl)}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ message: "Method not allowed" });
	}

	const session = await getServerSession(req, res, getAuthOptions(req));
	if (!session) {
		return res.status(401).json({ error: ErrorCode.InternalServerError });
	}

	if (!session.user?.email) {
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

	if (user.twoFactorEnabled) {
		return res.status(400).json({ error: ErrorCode.TwoFactorAlreadyEnabled });
	}

	if (!process.env.NEXTAUTH_SECRET) {
		console.error("Missing encryption key; cannot proceed with two factor setup.");
		return res.status(500).json({ error: ErrorCode.InternalServerError });
	}

	const isCorrectPassword = await compare(req.body.password, user.hash);

	if (!isCorrectPassword) {
		return res.status(400).json({ error: ErrorCode.IncorrectPassword });
	}

	// This generates a secret 32 characters in length. Do not modify the number of
	// bytes without updating the sanity checks in the enable and login endpoints.
	const secret = authenticator.generateSecret(20);

	await prisma.user.update({
		where: { email: session.user.email },
		data: {
			twoFactorEnabled: false,
			twoFactorSecret: encrypt(secret, generateInstanceSecret(TOTP_MFA_TOKEN_SECRET)),
		},
	});

	// const name = user.email;
	// const keyUri = authenticator.keyuri(name, "ZTNET", secret);
	// const dataUri = await qrcode.toDataURL(keyUri);

	const name = user.email;
	const issuer = "ZTNET";
	const logoUrl =
		"https://github.com/sinamics/ztnet/blob/main/docs/images/logo/ztnet_16x14.png?raw=true";
	const keyUri = generateOTPAuthURL(name, secret, issuer, logoUrl);
	const dataUri = await qrcode.toDataURL(keyUri);
	return res.json({ secret, keyUri, dataUri });
}
