import crypto from "crypto";

const SECRET = process.env.NEXTAUTH_SECRET;

export const SMTP_SECRET = "_smtp";

// Generate instance specific auth secret using salt
export const generateInstanceSecret = (contextSuffix: string) => {
	const salt = crypto
		.createHash("sha256")
		.update(String(SECRET))
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
};
