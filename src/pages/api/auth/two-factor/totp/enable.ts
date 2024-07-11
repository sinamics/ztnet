import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";
import { authenticator } from "otplib";
import User, { IUser } from "../../../../../models/User";
import { symmetricDecrypt } from "../../../../../utils/crypto";
import { ErrorCode } from "../../../../../utils/ErrorCode";

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
		return res.status(500).json({ error: ErrorCode.InternalServerError });
	}

	const user = await User.findOne<IUser>({ email: session.user.email });

	if (!user) {
		console.error(`Session references user that no longer exists.`);
		return res.status(401).json({ message: "Not authenticated" });
	}

	if (user.twoFactorEnabled) {
		return res.status(400).json({ error: ErrorCode.TwoFactorAlreadyEnabled });
	}

	if (!user.twoFactorSecret) {
		return res.status(400).json({ error: ErrorCode.TwoFactorSetupRequired });
	}

	if (!process.env.ENCRYPTION_KEY) {
		console.error("Missing encryption key; cannot proceed with two factor setup.");
		return res.status(500).json({ error: ErrorCode.InternalServerError });
	}

	const secret = symmetricDecrypt(user.twoFactorSecret, process.env.ENCRYPTION_KEY);
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

	await User.updateOne(
		{ email: session.user?.email },
		{
			twoFactorEnabled: true,
		},
	);

	return res.json({ message: "Two-factor enabled" });
}
