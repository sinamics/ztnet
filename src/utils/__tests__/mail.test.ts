import { describe, test, expect, jest } from "@jest/globals";
import { getReadableSmtpError, getSmtpEncryptionConfig } from "../mail";

/**
 * Tests for getReadableSmtpError function
 *
 * This function converts technical SMTP errors into user-friendly messages.
 * It's critical for user experience when email configuration fails.
 */
describe("getReadableSmtpError", () => {
	describe("SSL/TLS errors", () => {
		test("should handle wrong version number error", () => {
			const error = new Error(
				"write EPROTO 8076:error:100000f7:SSL routines:ssl3_get_record:wrong version number",
			);
			const result = getReadableSmtpError(error);
			expect(result).toBe(
				"SSL/TLS connection failed. Please check your encryption settings: use SSL/TLS for port 465, or STARTTLS for port 587.",
			);
		});

		test("should handle ssl3_get_record error", () => {
			const error = new Error("ssl3_get_record:wrong version number");
			const result = getReadableSmtpError(error);
			expect(result).toBe(
				"SSL/TLS connection failed. Please check your encryption settings: use SSL/TLS for port 465, or STARTTLS for port 587.",
			);
		});

		test("should handle WRONG VERSION NUMBER in uppercase", () => {
			const error = new Error("SSL: WRONG VERSION NUMBER");
			const result = getReadableSmtpError(error);
			expect(result).toBe(
				"SSL/TLS connection failed. Please check your encryption settings: use SSL/TLS for port 465, or STARTTLS for port 587.",
			);
		});

		test("should handle generic TLS error", () => {
			const error = new Error("TLS negotiation failed");
			const result = getReadableSmtpError(error);
			expect(result).toBe(
				"SSL/TLS error: TLS negotiation failed. Please verify your encryption settings match your mail server requirements.",
			);
		});

		test("should handle generic SSL error", () => {
			const error = new Error("SSL connection error");
			const result = getReadableSmtpError(error);
			expect(result).toBe(
				"SSL/TLS error: SSL connection error. Please verify your encryption settings match your mail server requirements.",
			);
		});

		test("should handle lowercase tls error", () => {
			const error = new Error("tls handshake failure");
			const result = getReadableSmtpError(error);
			expect(result).toBe(
				"SSL/TLS error: tls handshake failure. Please verify your encryption settings match your mail server requirements.",
			);
		});

		test("should handle mixed case Ssl error", () => {
			const error = new Error("Ssl protocol error");
			const result = getReadableSmtpError(error);
			expect(result).toBe(
				"SSL/TLS error: Ssl protocol error. Please verify your encryption settings match your mail server requirements.",
			);
		});
	});

	describe("Connection errors", () => {
		test("should handle ECONNREFUSED error", () => {
			const error = new Error("connect ECONNREFUSED 127.0.0.1:587");
			const result = getReadableSmtpError(error);
			expect(result).toBe(
				"Connection refused. Please verify the SMTP host and port are correct and the server is accessible.",
			);
		});

		test("should handle ETIMEDOUT error", () => {
			const error = new Error("connect ETIMEDOUT 192.168.1.1:25");
			const result = getReadableSmtpError(error);
			expect(result).toBe(
				"Connection timed out. Please verify the SMTP host and port are correct and the server is accessible.",
			);
		});

		test("should handle ESOCKET error", () => {
			const error = new Error("ESOCKET connection failed");
			const result = getReadableSmtpError(error);
			expect(result).toBe(
				"Connection timed out. Please verify the SMTP host and port are correct and the server is accessible.",
			);
		});
	});

	describe("DNS errors", () => {
		test("should handle ENOTFOUND error", () => {
			const error = new Error("getaddrinfo ENOTFOUND smtp.invalid.domain");
			const result = getReadableSmtpError(error);
			expect(result).toBe(
				"Could not resolve SMTP host. Please verify the hostname is correct.",
			);
		});

		test("should handle getaddrinfo error", () => {
			const error = new Error("getaddrinfo EAI_AGAIN smtp.example.com");
			const result = getReadableSmtpError(error);
			expect(result).toBe(
				"Could not resolve SMTP host. Please verify the hostname is correct.",
			);
		});
	});

	describe("Authentication errors", () => {
		test("should handle Invalid login error", () => {
			const error = new Error("Invalid login: 535 5.7.8 Authentication failed");
			const result = getReadableSmtpError(error);
			expect(result).toBe(
				"Authentication failed. Please check your username and password.",
			);
		});

		test("should handle authentication failed error", () => {
			const error = new Error("authentication failed: bad credentials");
			const result = getReadableSmtpError(error);
			expect(result).toBe(
				"Authentication failed. Please check your username and password.",
			);
		});

		test("should handle EAUTH error", () => {
			const error = new Error(
				"EAUTH: authentication required but no credentials provided",
			);
			const result = getReadableSmtpError(error);
			expect(result).toBe(
				"Authentication failed. Please check your credentials or enable authentication if required by your mail server.",
			);
		});

		test("should handle 535 error code", () => {
			const error = new Error("535 Incorrect authentication data");
			const result = getReadableSmtpError(error);
			expect(result).toBe(
				"Authentication failed. Please check your credentials or enable authentication if required by your mail server.",
			);
		});
	});

	describe("Certificate errors", () => {
		test("should handle self signed certificate error", () => {
			const error = new Error("self signed certificate in certificate chain");
			const result = getReadableSmtpError(error);
			expect(result).toBe(
				"SSL certificate verification failed. If using a self-signed certificate, disable 'Verify SSL Certificate' in settings.",
			);
		});

		test("should handle certificate has expired error", () => {
			const error = new Error("certificate has expired");
			const result = getReadableSmtpError(error);
			expect(result).toBe(
				"SSL certificate verification failed. If using a self-signed certificate, disable 'Verify SSL Certificate' in settings.",
			);
		});

		test("should handle unable to verify error", () => {
			const error = new Error("unable to verify the first certificate");
			const result = getReadableSmtpError(error);
			expect(result).toBe(
				"SSL certificate verification failed. If using a self-signed certificate, disable 'Verify SSL Certificate' in settings.",
			);
		});
	});

	describe("STARTTLS errors", () => {
		test("should handle STARTTLS required error", () => {
			const error = new Error("STARTTLS required");
			const result = getReadableSmtpError(error);
			expect(result).toBe(
				"Server requires STARTTLS. Please change encryption setting to STARTTLS.",
			);
		});

		test("should handle Must issue a STARTTLS error", () => {
			const error = new Error("Must issue a STARTTLS command first");
			const result = getReadableSmtpError(error);
			expect(result).toBe(
				"Server requires STARTTLS. Please change encryption setting to STARTTLS.",
			);
		});
	});

	describe("Unknown errors", () => {
		test("should return original message for unknown error", () => {
			const error = new Error("Some unknown SMTP error occurred");
			const result = getReadableSmtpError(error);
			expect(result).toBe("Email sending failed: Some unknown SMTP error occurred");
		});

		test("should handle empty error message", () => {
			const error = new Error("");
			const result = getReadableSmtpError(error);
			expect(result).toBe("Email sending failed: ");
		});

		test("should handle error without message property", () => {
			const error = {} as Error;
			const result = getReadableSmtpError(error);
			expect(result).toBe("Email sending failed: ");
		});
	});
});

/**
 * Tests for getSmtpEncryptionConfig function
 *
 * This function determines SMTP transport encryption settings.
 * It handles both the new smtpEncryption field and legacy smtpUseSSL fallback.
 * Critical for establishing correct SMTP connections.
 */
describe("getSmtpEncryptionConfig", () => {
	describe("new smtpEncryption field", () => {
		test("should configure SSL encryption correctly", () => {
			const result = getSmtpEncryptionConfig({ smtpEncryption: "SSL" });
			expect(result).toEqual({
				secure: true,
				requireTLS: false,
				ignoreTLS: false,
				resolvedEncryption: "SSL",
			});
		});

		test("should configure STARTTLS encryption correctly", () => {
			const result = getSmtpEncryptionConfig({ smtpEncryption: "STARTTLS" });
			expect(result).toEqual({
				secure: false,
				requireTLS: true,
				ignoreTLS: false,
				resolvedEncryption: "STARTTLS",
			});
		});

		test("should configure NONE encryption correctly", () => {
			const result = getSmtpEncryptionConfig({ smtpEncryption: "NONE" });
			expect(result).toEqual({
				secure: false,
				requireTLS: false,
				ignoreTLS: true,
				resolvedEncryption: "NONE",
			});
		});

		test("should prioritize smtpEncryption over legacy smtpUseSSL", () => {
			const result = getSmtpEncryptionConfig({
				smtpEncryption: "STARTTLS",
				smtpUseSSL: true, // Should be ignored
			});
			expect(result.resolvedEncryption).toBe("STARTTLS");
			expect(result.secure).toBe(false);
		});

		test("should prioritize smtpEncryption over port-based detection", () => {
			const result = getSmtpEncryptionConfig({
				smtpEncryption: "SSL",
				smtpPort: "25", // Would normally result in NONE
			});
			expect(result.resolvedEncryption).toBe("SSL");
			expect(result.secure).toBe(true);
		});
	});

	describe("legacy smtpUseSSL fallback", () => {
		test("should use SSL when smtpUseSSL is true", () => {
			const result = getSmtpEncryptionConfig({
				smtpUseSSL: true,
			});
			expect(result).toEqual({
				secure: true,
				requireTLS: false,
				ignoreTLS: false,
				resolvedEncryption: "SSL",
			});
		});

		test("should use SSL when smtpUseSSL is true regardless of port", () => {
			const result = getSmtpEncryptionConfig({
				smtpUseSSL: true,
				smtpPort: "587",
			});
			expect(result.resolvedEncryption).toBe("SSL");
			expect(result.secure).toBe(true);
		});
	});

	describe("port-based fallback when no encryption specified", () => {
		test("should use NONE for port 25 (legacy plaintext)", () => {
			const result = getSmtpEncryptionConfig({
				smtpPort: "25",
				smtpUseSSL: false,
			});
			expect(result).toEqual({
				secure: false,
				requireTLS: false,
				ignoreTLS: true,
				resolvedEncryption: "NONE",
			});
		});

		test("should use STARTTLS for port 587 (default)", () => {
			const result = getSmtpEncryptionConfig({
				smtpPort: "587",
				smtpUseSSL: false,
			});
			expect(result).toEqual({
				secure: false,
				requireTLS: true,
				ignoreTLS: false,
				resolvedEncryption: "STARTTLS",
			});
		});

		test("should use STARTTLS for port 465 when smtpUseSSL is false", () => {
			// This tests backward compatibility - if user had port 465 but smtpUseSSL false,
			// they likely misconfigured, but we default to STARTTLS for non-25 ports
			const result = getSmtpEncryptionConfig({
				smtpPort: "465",
				smtpUseSSL: false,
			});
			expect(result.resolvedEncryption).toBe("STARTTLS");
		});

		test("should use STARTTLS for port 2525", () => {
			const result = getSmtpEncryptionConfig({
				smtpPort: "2525",
				smtpUseSSL: false,
			});
			expect(result.resolvedEncryption).toBe("STARTTLS");
		});
	});

	describe("default behavior with minimal input", () => {
		test("should default to STARTTLS with no configuration", () => {
			const result = getSmtpEncryptionConfig({});
			expect(result).toEqual({
				secure: false,
				requireTLS: true,
				ignoreTLS: false,
				resolvedEncryption: "STARTTLS",
			});
		});

		test("should default to STARTTLS with null values", () => {
			const result = getSmtpEncryptionConfig({
				smtpEncryption: null,
				smtpUseSSL: null,
				smtpPort: null,
			});
			expect(result.resolvedEncryption).toBe("STARTTLS");
		});

		test("should default to STARTTLS with undefined values", () => {
			const result = getSmtpEncryptionConfig({
				smtpEncryption: undefined,
				smtpUseSSL: undefined,
				smtpPort: undefined,
			});
			expect(result.resolvedEncryption).toBe("STARTTLS");
		});
	});

	describe("invalid encryption value handling", () => {
		test("should default to STARTTLS for invalid encryption value", () => {
			const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
			const result = getSmtpEncryptionConfig({
				smtpEncryption: "INVALID_VALUE",
			});
			expect(result.resolvedEncryption).toBe("STARTTLS");
			expect(result.secure).toBe(false);
			expect(result.requireTLS).toBe(true);
			expect(consoleSpy).toHaveBeenCalledWith(
				'Invalid smtpEncryption value "INVALID_VALUE", defaulting to STARTTLS',
			);
			consoleSpy.mockRestore();
		});

		test("should default to STARTTLS for lowercase encryption value", () => {
			const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
			const result = getSmtpEncryptionConfig({
				smtpEncryption: "ssl", // lowercase - invalid
			});
			expect(result.resolvedEncryption).toBe("STARTTLS");
			expect(consoleSpy).toHaveBeenCalled();
			consoleSpy.mockRestore();
		});

		test("should default to STARTTLS for empty string encryption value", () => {
			const result = getSmtpEncryptionConfig({
				smtpEncryption: "",
			});
			// Empty string is falsy, so falls through to default behavior
			expect(result.resolvedEncryption).toBe("STARTTLS");
		});

		test("should default to STARTTLS for numeric encryption value", () => {
			const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
			const result = getSmtpEncryptionConfig({
				// @ts-expect-error Testing invalid type from database
				smtpEncryption: 123,
			});
			expect(result.resolvedEncryption).toBe("STARTTLS");
			expect(consoleSpy).toHaveBeenCalled();
			consoleSpy.mockRestore();
		});

		test("should default to STARTTLS for object encryption value", () => {
			const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
			const result = getSmtpEncryptionConfig({
				// @ts-expect-error Testing invalid type from database
				smtpEncryption: { type: "SSL" },
			});
			expect(result.resolvedEncryption).toBe("STARTTLS");
			expect(consoleSpy).toHaveBeenCalled();
			consoleSpy.mockRestore();
		});
	});

	describe("nodemailer transport options correctness", () => {
		test("SSL mode should work with port 465 (implicit TLS)", () => {
			const result = getSmtpEncryptionConfig({ smtpEncryption: "SSL" });
			// Port 465 requires secure:true from the start
			expect(result.secure).toBe(true);
			expect(result.requireTLS).toBe(false);
			expect(result.ignoreTLS).toBe(false);
		});

		test("STARTTLS mode should work with port 587 (explicit TLS upgrade)", () => {
			const result = getSmtpEncryptionConfig({ smtpEncryption: "STARTTLS" });
			// Port 587 starts unencrypted then upgrades via STARTTLS
			expect(result.secure).toBe(false);
			expect(result.requireTLS).toBe(true);
			expect(result.ignoreTLS).toBe(false);
		});

		test("NONE mode should work with port 25 (plaintext)", () => {
			const result = getSmtpEncryptionConfig({ smtpEncryption: "NONE" });
			// Port 25 with no encryption - ignore TLS entirely
			expect(result.secure).toBe(false);
			expect(result.requireTLS).toBe(false);
			expect(result.ignoreTLS).toBe(true);
		});
	});

	describe("real-world configuration scenarios", () => {
		test("Gmail SMTP (port 587 with STARTTLS)", () => {
			const result = getSmtpEncryptionConfig({
				smtpEncryption: "STARTTLS",
				smtpPort: "587",
			});
			expect(result.secure).toBe(false);
			expect(result.requireTLS).toBe(true);
		});

		test("Gmail SMTP (port 465 with SSL)", () => {
			const result = getSmtpEncryptionConfig({
				smtpEncryption: "SSL",
				smtpPort: "465",
			});
			expect(result.secure).toBe(true);
			expect(result.requireTLS).toBe(false);
		});

		test("Local mail server (port 25 no encryption)", () => {
			const result = getSmtpEncryptionConfig({
				smtpEncryption: "NONE",
				smtpPort: "25",
			});
			expect(result.secure).toBe(false);
			expect(result.ignoreTLS).toBe(true);
		});

		test("Migrated config: legacy SSL on port 465", () => {
			// User had old config with smtpUseSSL: true before migration
			const result = getSmtpEncryptionConfig({
				smtpUseSSL: true,
				smtpPort: "465",
			});
			expect(result.resolvedEncryption).toBe("SSL");
			expect(result.secure).toBe(true);
		});

		test("Migrated config: legacy port 25 plaintext", () => {
			// User had old config with port 25 and smtpUseSSL: false
			const result = getSmtpEncryptionConfig({
				smtpUseSSL: false,
				smtpPort: "25",
			});
			expect(result.resolvedEncryption).toBe("NONE");
			expect(result.ignoreTLS).toBe(true);
		});

		test("Migrated config: legacy port 587 STARTTLS", () => {
			// User had old config with port 587 and smtpUseSSL: false
			const result = getSmtpEncryptionConfig({
				smtpUseSSL: false,
				smtpPort: "587",
			});
			expect(result.resolvedEncryption).toBe("STARTTLS");
			expect(result.requireTLS).toBe(true);
		});
	});
});
