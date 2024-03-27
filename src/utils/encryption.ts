import crypto from "crypto";
import { prisma } from "~/server/db";
import { AuthorizationType } from "~/types/apiTypes";

const ZTNET_SECRET = process.env.NEXTAUTH_SECRET;

export const SMTP_SECRET = "_smtp";
export const API_TOKEN_SECRET = "_ztnet_api_token";
export const ORG_API_TOKEN_SECRET = "_ztnet_organization_api_token";
export const ORG_INVITE_TOKEN_SECRET = "_ztnet_org_invite";
export const PASSWORD_RESET_SECRET = "_ztnet_passwd_reset";

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
export const decrypt = <T>(text: string, secret: Buffer) => {
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
		return decrypted.toString() as T;
	} catch (err) {
		throw new Error(err);
	}
};

type DecryptedTokenData = {
	userId: string;
	name: string;
	apiAuthorizationType: AuthorizationType;
	tokenId: string;
};

type VerifyToken = {
	apiKey: string;
	requireAdmin?: boolean;
	apiAuthorizationType: AuthorizationType;
};

export async function decryptAndVerifyToken({
	apiKey,
	requireAdmin = false,
	apiAuthorizationType,
}: VerifyToken): Promise<DecryptedTokenData> {
	// Check if API key is provided
	if (!apiKey) {
		throw new Error("API key missing");
	}

	let decryptedData: DecryptedTokenData;

	// Try decrypting the token
	try {
		const decryptedString = decrypt<string>(
			apiKey,
			generateInstanceSecret(API_TOKEN_SECRET),
		);
		decryptedData = JSON.parse(decryptedString);
	} catch (_error) {
		throw new Error("Invalid token");
	}
	// Validate the decrypted data structure (add more validations as necessary)
	if (
		!decryptedData.userId ||
		typeof decryptedData.userId !== "string" ||
		!decryptedData.tokenId
	) {
		throw new Error("Invalid token");
	}

	// validate the authorization type in token with the required authorization type
	if (
		!Array.isArray(decryptedData.apiAuthorizationType) ||
		!decryptedData.apiAuthorizationType.includes(apiAuthorizationType)
	) {
		throw new Error("Invalid Authorization Type");
	}

	// get the token from the database
	const token = await prisma.aPIToken.findUnique({
		where: {
			id: decryptedData.tokenId,
			userId: decryptedData.userId,
		},
		select: {
			expiresAt: true,
		},
	});
	if (!token) {
		throw new Error("Invalid token");
	}

	// check if the token is expired
	if (token.expiresAt) {
		const expiresAt = new Date(token.expiresAt);
		if (expiresAt < new Date()) {
			throw new Error("Token expired");
		}
	}

	// Verify if the user exists and has the required token
	const user = await prisma.user.findUnique({
		where: {
			id: decryptedData.userId,
		},
		select: {
			id: true,
			role: true,
			apiTokens: {
				where: {
					token: apiKey,
				},
			},
		},
	});

	if (!user) {
		throw new Error("Unauthorized");
	}

	if (user.apiTokens.length === 0) {
		throw new Error("Invalid or expired token");
	}

	if (user.role !== "ADMIN" && requireAdmin) {
		throw new Error("Unauthorized");
	}

	return decryptedData;
}
