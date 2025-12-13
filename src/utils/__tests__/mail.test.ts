import { describe, test, expect } from "@jest/globals";
import { getReadableSmtpError } from "../mail";

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
