import { type GlobalOptions } from "@prisma/client";
import nodemailer, { type TransportOptions } from "nodemailer";
import { throwError } from "~/server/helpers/errorHandler";

export const inviteUserTemplate = () => {
  return {
    inviteUserBody:
      "Hi <b><%= toEmail %></b><br /><%= fromName %> wants you to join the ztnet network: <%= nwid %><br />If you do not know Bernt Christian Egeland, please ignore this message!<br /><br />Use the ZeroTier One GUI or command line on your device to join the network: <%= nwid %><br />For Example:<br />zerotier-cli join <%= nwid %><br /><br />Make sure to let <%= fromName %> know your device ID so that they can authorize it.<br /><br />For detailed instructions and download links, visit:<br />https://www.zerotier.com/download.shtml<br /><br />Sincerely,<br />--<br />Next Ztnet",
    inviteUserSubject: "Next Ztnet -- Invitation to join network: <%= nwid %>",
  };
};

export function createTransporter(globalOptions: GlobalOptions) {
  if (
    !globalOptions.smtpHost ||
    !globalOptions.smtpPort ||
    !globalOptions.smtpEmail ||
    !globalOptions.smtpPassword ||
    !globalOptions.smtpUsername
  ) {
    return throwError(
      "Email is not configured!, you can configure it in the admin panel or ask your administrator to do so."
    );
  }
  return nodemailer.createTransport({
    host: globalOptions.smtpHost,
    port: globalOptions.smtpPort,
    secure: globalOptions.smtpSecure,
    auth: {
      user: globalOptions.smtpEmail,
      pass: globalOptions.smtpPassword,
    },
    tls: {
      rejectUnauthorized: false,
    },
  } as TransportOptions);
}

interface SendMailResult {
  accepted: string[];
  // add other properties as needed
}

export async function sendEmail(
  transporter: nodemailer.Transporter<unknown>,
  mailOptions: nodemailer.SendMailOptions
) {
  const info = (await transporter.sendMail(mailOptions)) as SendMailResult;

  if (!info.accepted.includes(mailOptions.to as string)) {
    return throwError("Email could not be sent, check your credentials");
  }
}
