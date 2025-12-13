import nodemailer, { type TransportOptions } from "nodemailer";
import { throwError } from "~/server/helpers/errorHandler";
import { SMTP_SECRET, decrypt, generateInstanceSecret } from "./encryption";
import { prisma } from "~/server/db";
import ejs from "ejs";
import { GlobalOptions, UserOptions } from "@prisma/client";
import { MailTemplateKey } from "./enums";

export const inviteOrganizationTemplate = () => {
	return {
		subject: "Invitation to join ZTNET Organization <%= fromOrganization %>",
		body:
			"Hello <%= toEmail %>,<br /><br />" +
			"You have been invited by <%= fromAdmin %> to join our ZTNET organization, '<%= fromOrganization %>'. We are excited to potentially have you on board and look forward to collaborating with you.<br /><br />" +
			"To complete your invitation process, kindly use the link below. Please note, the link will expire after 24 hours.<br />" +
			"<a href='<%= invitationLink %>' style='color: blue; text-decoration: underline;'><%= invitationLink %></a><br /><br />" +
			"If you are not familiar with '<%= fromAdmin %>' or '<%= fromOrganization %>', please disregard this message for your security.<br /><br />" +
			"Warm regards,<br />" +
			"<%= fromOrganization %><br />" +
			"ZTNET Team",
	};
};

export const inviteUserTemplate = () => {
	return {
		subject: "ZTNET -- Invitation to join network: <%= nwid %>",
		body:
			"Hi <b><%= toEmail %></b>,<br />" +
			"<%= fromName %> wants you to join the ztnet network: <%= nwid %>.<br />" +
			"If you do not know <%= fromName %>, please ignore this message!<br /><br />" +
			"Use the ZeroTier One GUI or command line on your device to join the network: <%= nwid %>.<br />" +
			"For Example:<br />zerotier-cli join <%= nwid %><br /><br />" +
			"Make sure to let <%= fromName %> know your device ID so that they can authorize it.<br /><br />" +
			"For detailed instructions and download links, visit:<br />" +
			"<a href='https://www.zerotier.com/download' style='color: blue; text-decoration: underline;'>https://www.zerotier.com/download</a><br /><br />" +
			"Sincerely,<br />--<br />ZTNET",
	};
};

export const forgotPasswordTemplate = () => {
	return {
		subject: "Password Reset Request",
		body:
			"Hi <b><%= toEmail %></b>,<br /><br />" +
			"We received a request to reset your password. <br />" +
			"Click here to create a new password: <br /><%= forgotLink %><br /><br />" +
			"Please note, this link is valid for 15 minutes. If it expires, you will need to request a new one. <br />" +
			"If you did not request a password reset, please ignore this message. <br /><br />" +
			"Sincerely,<br />--<br />ZTNET",
	};
};

export const verifyEmailTemplate = () => {
	return {
		subject: "Verify Your Email Address",
		body:
			"Hi <b><%= toName %></b>,<br /><br />" +
			"Welcome to ZTNET! <br /><br />" +
			"Please verify your email address by clicking the link below: <br /><%= verifyLink %><br /><br />" +
			"Please note, this link is valid for 15 minutes. If it expires, you will need to request a new one. <br />" +
			"If you did not create an account, please ignore this message. <br /><br />" +
			"Sincerely,<br />--<br />ZTNET",
	};
};

export const notificationTemplate = () => {
	return {
		subject: "New Notification from ZTNET",
		body:
			"Hi <b><%= toName %></b>,<br /><br />" +
			"You have a new notification from ZTNET. <br /><br />" +
			"<%= notificationMessage %><br /><br />" +
			"If this notification does not concern you, please ignore this message. <br /><br />" +
			"Sincerely,<br />--<br />ZTNET",
	};
};

export const deviceIpChangeNotificationTemplate = () => {
	return {
		subject: "ZTNET: Your account has been accessed from a new IP Address",
		body:
			"Hello,<br /><br />" +
			"Your security is very important to us. Your ZTNET account was accessed from a new IP address:" +
			"<br /><br />" +
			"------------------------------------------<br />" +
			"email: <%= toEmail %><br />" +
			"time: <%= accessTime %> UTC<br />" +
			"IP address: <%= ipAddress %><br />" +
			"browser: <%= browserInfo %><br />" +
			"------------------------------------------<br />" +
			"<br /><br />" +
			"If this was you, you can ignore this alert. If you noticed any suspicious activity on your account, please change your password and enable two-factor authentication on your account page at <%= accountPageUrl %>.<br /><br />" +
			"Sincerely,<br />--<br />ZTNET",
	};
};

export const newDeviceNotificationTemplate = () => {
	return {
		subject: "ZTNET: New Device Detected",
		body:
			"Hello,<br /><br />" +
			"A new device has been associated with your ZTNET account. <br /><br />" +
			"------------------------------------------<br />" +
			"time: <%= accessTime %> UTC<br />" +
			"IP address: <%= ipAddress %><br />" +
			"browser: <%= browserInfo %><br />" +
			"------------------------------------------<br />" +
			"<br /><br />" +
			"If this was you, you can ignore this alert. If you noticed any suspicious activity on your account, please change your password and enable two-factor authentication on your account page at <%= accountPageUrl %>.<br /><br />" +
			"Sincerely,<br />--<br />ZTNET",
	};
};

export const mailTemplateMap = {
	inviteUserTemplate,
	forgotPasswordTemplate,
	verifyEmailTemplate,
	notificationTemplate,
	inviteOrganizationTemplate,
	newDeviceNotificationTemplate,
	deviceIpChangeNotificationTemplate,
} as const;

interface EmailTemplate {
	subject: string;
	body: string;
}

interface EmailOptions {
	to: string;
	templateData: Record<string, unknown>;
	userId?: string;
	sendInBackground?: boolean;
}

export async function sendMailWithTemplate(
	templateKey: MailTemplateKey,
	options: EmailOptions,
) {
	const globalOptions = await prisma.globalOptions.findFirst({
		where: { id: 1 },
	});

	if (!globalOptions) {
		throw new Error("Global options not found");
	}

	if (options.userId) {
		if (!(await checkUserPreferences(options.userId, templateKey))) {
			return;
		}
	}

	const template = await getTemplate(globalOptions, templateKey);

	const renderedTemplate = await renderTemplate(template, options.templateData);

	const transporter = await createTransporter();

	const parsedTemplate = parseRenderedTemplate(renderedTemplate);

	const fromAddress = globalOptions.smtpFromName
		? { name: globalOptions.smtpFromName, address: globalOptions.smtpEmail }
		: globalOptions.smtpEmail;

	const mailOptions = {
		from: fromAddress,
		to: options.to,
		subject: parsedTemplate.subject,
		html: parsedTemplate.body,
	};

	// If explicit synchronous sending is requested (sendInBackground === false), wait for the result
	// Otherwise (default), send in background to avoid blocking
	if (options.sendInBackground === false) {
		await sendEmail(transporter, mailOptions);
	} else {
		// Run SMTP operation in background
		setImmediate(async () => {
			try {
				await sendEmail(transporter, mailOptions);
			} catch (error) {
				console.error("Email sending failed:", error);
			}
		});
	}
}

/**
 * Check if the user has disabled notifications for the given template
 *
 */
async function checkUserPreferences(
	userId: string,
	templateKey: MailTemplateKey,
): Promise<boolean> {
	const userOptions = await prisma.userOptions.findUnique({ where: { userId } });
	if (!userOptions) {
		return false;
	}

	const templateToOptionMap: Record<string, string> = {
		newDeviceNotificationTemplate: "newDeviceNotification",
		deviceIpChangeNotificationTemplate: "deviceIpChangeNotification",
	};

	const optionField = templateToOptionMap[templateKey];
	if (optionField && !(userOptions as UserOptions)[optionField]) {
		return false;
	}

	return true;
}

async function getTemplate(
	globalOptions: GlobalOptions,
	templateKey: MailTemplateKey,
): Promise<EmailTemplate> {
	const defaultTemplate = mailTemplateMap[templateKey]();

	if (!(templateKey in globalOptions)) {
		return defaultTemplate;
	}

	const storedTemplate = globalOptions[templateKey];

	if (typeof storedTemplate !== "string") {
		return defaultTemplate;
	}

	try {
		const parsedTemplate = JSON.parse(storedTemplate);
		return parsedTemplate;
	} catch (error) {
		console.error(`Failed to parse template '${templateKey}':`, error);
		return defaultTemplate;
	}
}

async function renderTemplate(
	template: EmailTemplate,
	templateData: Record<string, unknown>,
): Promise<string> {
	try {
		return await ejs.render(JSON.stringify(template), templateData, { async: true });
	} catch (error) {
		console.error(`Failed to render template: ${error.message}`);
		throw new Error("Template rendering failed");
	}
}

function parseRenderedTemplate(renderedTemplate: string): EmailTemplate {
	try {
		return JSON.parse(renderedTemplate);
	} catch (error) {
		console.error(`Failed to parse rendered template: ${error.message}`);
		throw new Error("Failed to parse rendered template");
	}
}

interface SendMailResult {
	accepted: string[];
}

/**
 * Converts technical SMTP errors into user-friendly messages
 */
export function getReadableSmtpError(error: Error): string {
	const message = error.message || "";
	const messageLower = message.toLowerCase();

	// SSL/TLS version mismatch errors
	if (
		messageLower.includes("wrong version number") ||
		messageLower.includes("ssl3_get_record")
	) {
		return "SSL/TLS connection failed. Please check your encryption settings: use SSL/TLS for port 465, or STARTTLS for port 587.";
	}

	// Connection refused
	if (message.includes("ECONNREFUSED")) {
		return "Connection refused. Please verify the SMTP host and port are correct and the server is accessible.";
	}

	// Connection timeout
	if (message.includes("ETIMEDOUT") || message.includes("ESOCKET")) {
		return "Connection timed out. Please verify the SMTP host and port are correct and the server is accessible.";
	}

	// DNS resolution failure
	if (message.includes("ENOTFOUND") || messageLower.includes("getaddrinfo")) {
		return "Could not resolve SMTP host. Please verify the hostname is correct.";
	}

	// Authentication failures
	if (
		messageLower.includes("invalid login") ||
		messageLower.includes("authentication failed")
	) {
		return "Authentication failed. Please check your username and password.";
	}

	if (message.includes("EAUTH") || message.includes("535")) {
		return "Authentication failed. Please check your credentials or enable authentication if required by your mail server.";
	}

	// Certificate errors
	if (
		messageLower.includes("self signed certificate") ||
		messageLower.includes("certificate has expired") ||
		messageLower.includes("unable to verify")
	) {
		return "SSL certificate verification failed. If using a self-signed certificate, disable 'Verify SSL Certificate' in settings.";
	}

	// STARTTLS required but not available
	if (
		messageLower.includes("starttls") ||
		messageLower.includes("must issue a starttls")
	) {
		return "Server requires STARTTLS. Please change encryption setting to STARTTLS.";
	}

	// Generic TLS/SSL errors (case-insensitive)
	if (messageLower.includes("tls") || messageLower.includes("ssl")) {
		return `SSL/TLS error: ${message}. Please verify your encryption settings match your mail server requirements.`;
	}

	// Return original message if no specific handler
	return `Email sending failed: ${message}`;
}

async function sendEmail(
	transporter: nodemailer.Transporter<unknown>,
	mailOptions: nodemailer.SendMailOptions,
) {
	try {
		const info = (await transporter.sendMail(mailOptions)) as SendMailResult;

		if (!info.accepted.includes(mailOptions.to as string)) {
			return throwError("Email could not be sent, check your credentials");
		}
	} catch (error) {
		const readableError = getReadableSmtpError(error as Error);
		return throwError(readableError);
	}
}

export async function createTransporter() {
	const globalOptions = await prisma.globalOptions.findFirst({
		where: {
			id: 1,
		},
	});
	if (!globalOptions.smtpHost || !globalOptions.smtpPort || !globalOptions.smtpEmail) {
		return throwError(
			"Email is not configured!, you can configure it in the admin panel or ask your administrator to do so.",
		);
	}

	if (globalOptions.smtpPassword) {
		globalOptions.smtpPassword = decrypt(
			globalOptions.smtpPassword,
			generateInstanceSecret(SMTP_SECRET),
		);
	}

	// Determine encryption settings based on smtpEncryption field
	// Fall back to legacy fields for backward compatibility
	let encryption = globalOptions.smtpEncryption;
	if (!encryption) {
		if (globalOptions.smtpUseSSL) {
			encryption = "SSL";
		} else if (globalOptions.smtpPort === "25") {
			// Port 25 typically uses no encryption or opportunistic STARTTLS
			encryption = "NONE";
		} else {
			// Port 587 (default) uses STARTTLS
			encryption = "STARTTLS";
		}
	}

	// secure: true for SSL/TLS (port 465), false for STARTTLS (port 587) or NONE
	const secure = encryption === "SSL";

	// requireTLS: true for STARTTLS to force upgrade, false otherwise
	const requireTLS = encryption === "STARTTLS";

	// ignoreTLS: true for NONE (plaintext), false otherwise
	const ignoreTLS = encryption === "NONE";

	// Determine if authentication should be used
	// Fall back to checking if credentials exist for backward compatibility
	const useAuth =
		globalOptions.smtpUseAuthentication ??
		(Boolean(globalOptions.smtpUsername) || Boolean(globalOptions.smtpPassword));

	return nodemailer.createTransport({
		host: globalOptions.smtpHost,
		port: globalOptions.smtpPort,
		secure,
		requireTLS,
		ignoreTLS,
		auth:
			useAuth && (globalOptions.smtpUsername || globalOptions.smtpPassword)
				? {
						user: globalOptions.smtpUsername,
						pass: globalOptions.smtpPassword,
					}
				: undefined,
		tls: {
			rejectUnauthorized: globalOptions.smtpRequireTLS,
		},
	} as TransportOptions);
}
