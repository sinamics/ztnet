import { type GlobalOptions } from "@prisma/client";
import nodemailer, { type TransportOptions } from "nodemailer";
import { throwError } from "~/server/helpers/errorHandler";
import { SMTP_SECRET, decrypt, generateInstanceSecret } from "./encryption";

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
			"<a href='https://www.zerotier.com/download.shtml' style='color: blue; text-decoration: underline;'>https://www.zerotier.com/download.shtml</a><br /><br />" +
			"Sincerely,<br />--<br />ZTNET",
	};
};

export const forgotPasswordTemplate = () => {
	return {
		body:
			"Hi <b><%= toEmail %></b>,<br /><br />" +
			"We received a request to reset your password. <br />" +
			"Click here to create a new password: <br /><%= forgotLink %><br /><br />" +
			"Please note, this link is valid for 15 minutes. If it expires, you will need to request a new one. <br />" +
			"If you did not request a password reset, please ignore this message. <br /><br />" +
			"Sincerely,<br />--<br />ZTNET",
		subject: "Password Reset Request",
	};
};

export const notificationTemplate = () => {
	return {
		body:
			"Hi <b><%= toName %></b>,<br /><br />" +
			"You have a new notification from ZTNET. <br /><br />" +
			"<%= notificationMessage %><br /><br />" +
			"If this notification does not concern you, please ignore this message. <br /><br />" +
			"Sincerely,<br />--<br />ZTNET",
		subject: "New Notification from ZTNET",
	};
};

export function createTransporter(globalOptions: GlobalOptions) {
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
	return nodemailer.createTransport({
		host: globalOptions.smtpHost,
		port: globalOptions.smtpPort,
		secure: globalOptions.smtpUseSSL,
		auth: {
			user: globalOptions.smtpUsername,
			pass: globalOptions.smtpPassword,
		},
		tls: {
			rejectUnauthorized: true,
			minVersion: "TLSv1.2",
		},
	} as TransportOptions);
}

interface SendMailResult {
	accepted: string[];
}

export async function sendEmail(
	transporter: nodemailer.Transporter<unknown>,
	mailOptions: nodemailer.SendMailOptions,
) {
	const info = (await transporter.sendMail(mailOptions)) as SendMailResult;

	if (!info.accepted.includes(mailOptions.to as string)) {
		return throwError("Email could not be sent, check your credentials");
	}
}
