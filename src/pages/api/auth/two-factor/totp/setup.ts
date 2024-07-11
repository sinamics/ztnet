import type { NextApiRequest, NextApiResponse } from "next";
import { authenticator } from "otplib";
import qrcode from "qrcode";
import { getSession, signOut, useSession } from "next-auth/react";
import { prisma } from "~/server/db";
import { compare } from "bcryptjs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ message: "Method not allowed" });
	}

	const session = await getSession({ req });
	if (!session) {
		return res.status(401).json({ message: "Not authenticated" });
	}

	if (!session.user?.email) {
		console.error("Session is missing a user email.");
		return res.status(500).json({ error: "ErrorCode.InternalServerError" });
	}

	const user = await prisma.user.findUnique({
		where: { email: session.user.email },
	});

	if (!user) {
		console.error("Session references user that no longer exists.");
		return res.status(401).json({ message: "Not authenticated" });
	}

	if (!user.hash) {
		return res.status(400).json({ error: "ErrorCode.UserMissinghash" });
	}

	if (user.twoFactorEnabled) {
		return res.status(400).json({ error: "ErrorCode.TwoFactorAlreadyEnabled" });
	}

	if (!process.env.ENCRYPTION_KEY) {
		console.error("Missing encryption key; cannot proceed with two factor setup.");
		return res.status(500).json({ error: "ErrorCode.InternalServerError" });
	}

	const isCorrectPassword = await compare(req.body.password, user.hash);

	if (!isCorrectPassword) {
		return res.status(400).json({ error: "ErrorCode.IncorrectPassword" });
	}

	// This generates a secret 32 characters in length. Do not modify the number of
	// bytes without updating the sanity checks in the enable and login endpoints.
	const secret = authenticator.generateSecret(20);

	await prisma.user.update({
		where: { email: session.user.email },
		data: {
			twoFactorEnabled: false,
			twoFactorSecret: secret,
		},
	});

	const name = user.email;
	const keyUri = authenticator.keyuri(name, "ZTNET", secret);
	const dataUri = await qrcode.toDataURL(keyUri);

	return res.json({ secret, keyUri, dataUri });
}
