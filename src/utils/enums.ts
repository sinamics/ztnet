// Extracted mail enums as it caused issues if imported directly from mail.ts
export enum MailTemplateKey {
	InviteUser = "inviteUserTemplate",
	InviteAdmin = "inviteAdminTemplate",
	InviteOrganization = "inviteOrganizationTemplate",
	ForgotPassword = "forgotPasswordTemplate",
	VerifyEmail = "verifyEmailTemplate",
	Notification = "notificationTemplate",
	NewDeviceNotification = "newDeviceNotificationTemplate",
	DeviceIpChangeNotification = "deviceIpChangeNotificationTemplate",
}
