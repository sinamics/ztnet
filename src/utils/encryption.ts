import crypto from "crypto";
import { prisma } from "~/server/db";

const ZTNET_SECRET = process.env.NEXTAUTH_SECRET;

export const SMTP_SECRET = "_smtp";
export const API_TOKEN_SECRET = "_ztnet_api_token";

// Generate instance specific auth secret using salt
export const generateInstanceSecret = (contextSuffix: string) => {
	const salt = crypto
		.createHash("sha256")
		.update(String(ZTNET_SECRET))
		.update(String(contextSuffix))
		.digest();

	return salt;
};

// Encryption Function
export const encrypt = (text: string, secret: Buffer) => {
	const iv = crypto.randomBytes(16);
	const cipher = crypto.createCipheriv(
		"aes-256-cbc",
		Buffer.from(secret.slice(0, 32)),
		iv,
	);
	const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
	return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
};

// Decryption Function
export const decrypt = (text: string, secret: Buffer) => {
	try {
		if (!secret) {
			throw new Error("Secret is empty");
		}

		const secretBuffer = Buffer.from(secret);

		if (secretBuffer.length !== 32) {
			throw new Error(`Invalid key length: ${secretBuffer.length}, Secret: ${secret}`);
		}

		const textParts = text.split(":");
		const iv = Buffer.from(textParts.shift()!, "hex");
		const encryptedText = Buffer.from(textParts.join(":"), "hex");

		const decipher = crypto.createDecipheriv("aes-256-cbc", secretBuffer, iv);

		const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
		return decrypted.toString();
	} catch (err) {
		throw new Error(err);
	}
};

type DecryptedTokenData = {
	userId: string;
	name: string;
};

type VerifyToken = {
	apiKey: string;
	requireAdmin?: boolean;
};

export async function decryptAndVerifyToken({
	apiKey,
	requireAdmin = false,
}: VerifyToken): Promise<DecryptedTokenData> {
	// Check if API key is provided
	if (!apiKey) {
		throw new Error("API key missing");
	}

	let decryptedData: DecryptedTokenData;

	// Try decrypting the token
	try {
		const decryptedString = decrypt(apiKey, generateInstanceSecret(API_TOKEN_SECRET));
		decryptedData = JSON.parse(decryptedString);
	} catch (_error) {
		throw new Error("Decryption failed");
	}

	// Validate the decrypted data structure (add more validations as necessary)
	if (!decryptedData.userId || typeof decryptedData.userId !== "string") {
		throw new Error("Invalid token structure");
	}

	// Verify if the user exists and has the required role
	const user = await prisma.user.findFirst({
		where: {
			id: decryptedData.userId,
		},
	});

	if (!user) {
		throw new Error("Unauthorized");
	}

	if (user.role !== "ADMIN" && requireAdmin) {
		throw new Error("Unauthorized");
	}

	return decryptedData;
}
