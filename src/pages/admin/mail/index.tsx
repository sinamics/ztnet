import { type ReactElement, useState, useEffect } from "react";
import { LayoutAdminAuthenticated } from "~/components/layouts/layout";
import { api } from "~/utils/api";
import MailUserInviteTemplate from "~/components/adminPage/mail/mailUserInviteTemplate";
import ForgotPasswordMailTemplate from "~/components/adminPage/mail/mailForgotPasswordTemplate";
import NotificationTemplate from "~/components/adminPage/mail/mailNotificationTemplate";
import { useTranslations } from "next-intl";
import OrganizationInviteTemplate from "~/components/adminPage/mail/mailOrganizationInviteTemplate";
import {
	useTrpcApiErrorHandler,
	useTrpcApiSuccessHandler,
} from "~/hooks/useTrpcApiHandler";
import MenuSectionDividerWrapper from "~/components/shared/menuSectionDividerWrapper";
import NewDeviceNotificationTemplate from "~/components/adminPage/mail/mailNewDeviceNotificationTemplate";
import DeviceIpChangeNotificationTemplate from "~/components/adminPage/mail/mailDeviceIpChangeNotificationTemplate";
import VerifyEmailTemplate from "~/components/adminPage/mail/mailVerifyEmail";
import { MailTemplateKey } from "~/utils/enums";

interface MailFormState {
	smtpEmail: string;
	smtpFromName: string;
	smtpHost: string;
	smtpPort: string;
	smtpEncryption: "NONE" | "SSL" | "STARTTLS";
	smtpUseAuthentication: boolean;
	smtpUsername: string;
	smtpPassword: string;
	smtpRequireTLS: boolean;
}

const PASSWORD_PLACEHOLDER = "••••••••";
const COMMON_SMTP_PORTS = [25, 465, 587, 2525];

const Mail = () => {
	const t = useTranslations("admin");

	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();

	const {
		data: options,
		refetch: refetchOptions,
		isLoading: loadingOptions,
	} = api.admin.getAllOptions.useQuery();

	const { mutate: setMailOptions, isPending: isSaving } = api.admin.setMail.useMutation({
		onSuccess: handleApiSuccess({
			actions: [refetchOptions],
			toastMessage: t("mail.settingsSaved"),
		}),
		onError: handleApiError,
	});

	const { mutate: sendTestMail, isPending: sendingTestMail } =
		api.admin.sendTestMail.useMutation({
			onSuccess: handleApiSuccess({
				toastMessage: t("mail.testEmailSent"),
			}),
			onError: handleApiError,
		});

	// Local form state
	const [formState, setFormState] = useState<MailFormState>({
		smtpEmail: "",
		smtpFromName: "",
		smtpHost: "",
		smtpPort: "587",
		smtpEncryption: "STARTTLS",
		smtpUseAuthentication: true,
		smtpUsername: "",
		smtpPassword: "",
		smtpRequireTLS: false,
	});

	// Track if form has unsaved changes
	const [hasChanges, setHasChanges] = useState(false);

	// Track if password field has been modified by user
	const [passwordChanged, setPasswordChanged] = useState(false);

	// Initialize form state from server data
	useEffect(() => {
		if (options) {
			setFormState({
				smtpEmail: options.smtpEmail || "",
				smtpFromName: options.smtpFromName || "",
				smtpHost: options.smtpHost || "",
				smtpPort: options.smtpPort || "587",
				smtpEncryption:
					(options.smtpEncryption as "NONE" | "SSL" | "STARTTLS") || "STARTTLS",
				smtpUseAuthentication: options.smtpUseAuthentication ?? true,
				smtpUsername: options.smtpUsername || "",
				// Don't populate password - use empty string, show placeholder if password exists
				smtpPassword: "",
				smtpRequireTLS: options.smtpRequireTLS || false,
			});
			setHasChanges(false);
			setPasswordChanged(false);
		}
	}, [options]);

	const handleInputChange = (field: keyof MailFormState, value: string | boolean) => {
		setFormState((prev) => ({ ...prev, [field]: value }));
		setHasChanges(true);
	};

	const handlePasswordChange = (value: string) => {
		setFormState((prev) => ({ ...prev, smtpPassword: value }));
		setPasswordChanged(true);
		setHasChanges(true);
	};

	// Validate port number
	const getPortValidation = () => {
		const port = Number.parseInt(formState.smtpPort, 10);
		if (!formState.smtpPort) return null;
		if (Number.isNaN(port) || port < 1 || port > 65535) {
			return { isError: true, message: t("mail.portInvalid") };
		}
		if (!COMMON_SMTP_PORTS.includes(port)) {
			return { isError: false, message: t("mail.portUncommon") };
		}
		return null;
	};

	const portValidation = getPortValidation();

	const handleSave = () => {
		// Determine password value to send:
		// - undefined: don't change (user didn't touch the field)
		// - null: clear the password (user cleared the field)
		// - string: set new password (user entered a value)
		let passwordValue: string | null | undefined = undefined;
		if (passwordChanged) {
			passwordValue = formState.smtpPassword || null; // empty string becomes null to clear
		}

		setMailOptions({
			smtpEmail: formState.smtpEmail || undefined,
			smtpFromName: formState.smtpFromName || undefined,
			smtpHost: formState.smtpHost || undefined,
			smtpPort: formState.smtpPort || undefined,
			smtpEncryption: formState.smtpEncryption,
			smtpUseAuthentication: formState.smtpUseAuthentication,
			smtpUsername: formState.smtpUsername || undefined,
			smtpPassword: passwordValue,
			smtpRequireTLS: formState.smtpRequireTLS,
		});
		setHasChanges(false);
		setPasswordChanged(false);
	};

	if (loadingOptions) {
		return (
			<div className="flex flex-col items-center justify-center">
				<h1 className="text-center text-2xl font-semibold">
					<progress className="progress progress-primary w-56"></progress>
				</h1>
			</div>
		);
	}

	return (
		<main className="flex w-full flex-col justify-center space-y-10 bg-base-100 p-5 sm:p-3 xl:w-6/12">
			{options?.error ? (
				<div className="alert alert-warning alert-sm">
					<div className="flex-1">
						<label className="font-medium">Action Required</label>
						<p className="text-sm">{options?.message}</p>
					</div>
				</div>
			) : null}

			{/* Sender Settings */}
			<MenuSectionDividerWrapper title={t("mail.senderSettings")} className="space-y-5">
				<div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
					<div className="form-control w-full">
						<label className="label">
							<span className="label-text">{t("mail.senderEmail")}</span>
						</label>
						<input
							type="email"
							className="input input-bordered input-sm w-full"
							placeholder={t("mail.mailPlaceholder")}
							value={formState.smtpEmail}
							onChange={(e) => handleInputChange("smtpEmail", e.target.value)}
						/>
					</div>
					<div className="form-control w-full">
						<label className="label">
							<span className="label-text">{t("mail.senderName")}</span>
						</label>
						<input
							type="text"
							className="input input-bordered input-sm w-full"
							placeholder={t("mail.senderNamePlaceholder")}
							value={formState.smtpFromName}
							onChange={(e) => handleInputChange("smtpFromName", e.target.value)}
						/>
					</div>
				</div>
			</MenuSectionDividerWrapper>

			{/* SMTP Server */}
			<MenuSectionDividerWrapper title={t("mail.smtpServer")} className="space-y-5">
				<div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
					<div className="form-control w-full">
						<label className="label">
							<span className="label-text">{t("mail.smtpHost")}</span>
						</label>
						<input
							type="text"
							className="input input-bordered input-sm w-full"
							placeholder="smtp.example.com"
							value={formState.smtpHost}
							onChange={(e) => handleInputChange("smtpHost", e.target.value)}
						/>
					</div>
					<div className="form-control w-full">
						<label className="label">
							<span className="label-text">{t("mail.smtpPort")}</span>
						</label>
						<input
							type="number"
							className={`input input-bordered input-sm w-full ${
								portValidation?.isError ? "input-error" : ""
							}`}
							placeholder="587"
							min="1"
							max="65535"
							value={formState.smtpPort}
							onChange={(e) => handleInputChange("smtpPort", e.target.value)}
						/>
						{portValidation && (
							<label className="label">
								<span
									className={`label-text-alt ${
										portValidation.isError ? "text-error" : "text-warning"
									}`}
								>
									{portValidation.message}
								</span>
							</label>
						)}
					</div>
				</div>
				<div className="form-control w-full sm:w-1/2">
					<label className="label">
						<span className="label-text">{t("mail.encryption")}</span>
					</label>
					<select
						className="select select-bordered select-sm w-full"
						value={formState.smtpEncryption}
						onChange={(e) =>
							handleInputChange(
								"smtpEncryption",
								e.target.value as "NONE" | "SSL" | "STARTTLS",
							)
						}
					>
						<option value="NONE">{t("mail.encryptionNone")}</option>
						<option value="SSL">{t("mail.encryptionSSL")}</option>
						<option value="STARTTLS">{t("mail.encryptionSTARTTLS")}</option>
					</select>
					<label className="label">
						<span className="label-text-alt text-gray-500">
							{t("mail.encryptionDescription")}
						</span>
					</label>
				</div>
			</MenuSectionDividerWrapper>

			{/* Authentication */}
			<MenuSectionDividerWrapper title={t("mail.authentication")} className="space-y-5">
				<div className="flex items-center justify-between">
					<label>
						<p className="font-medium">{t("mail.useAuthentication")}</p>
						<p className="text-sm text-gray-500">
							{t("mail.useAuthenticationDescription")}
						</p>
					</label>
					<input
						type="checkbox"
						className="checkbox-primary checkbox checkbox-sm"
						checked={formState.smtpUseAuthentication}
						onChange={(e) => handleInputChange("smtpUseAuthentication", e.target.checked)}
					/>
				</div>
				{formState.smtpUseAuthentication && (
					<div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
						<div className="form-control w-full">
							<label className="label">
								<span className="label-text">{t("mail.username")}</span>
							</label>
							<input
								type="text"
								className="input input-bordered input-sm w-full"
								placeholder={t("mail.username")}
								value={formState.smtpUsername}
								onChange={(e) => handleInputChange("smtpUsername", e.target.value)}
								autoComplete="off"
							/>
						</div>
						<div className="form-control w-full">
							<label className="label">
								<span className="label-text">{t("mail.password")}</span>
							</label>
							<div className="flex gap-2">
								<input
									type="password"
									className="input input-bordered input-sm w-full"
									placeholder={options?.hasSmtpPassword ? PASSWORD_PLACEHOLDER : ""}
									value={formState.smtpPassword}
									onChange={(e) => handlePasswordChange(e.target.value)}
									autoComplete="new-password"
								/>
								{options?.hasSmtpPassword && !passwordChanged && (
									<button
										type="button"
										className="btn btn-outline btn-error btn-sm"
										onClick={() => {
											setFormState((prev) => ({ ...prev, smtpPassword: "" }));
											setPasswordChanged(true);
											setHasChanges(true);
										}}
										title={t("mail.clearPassword")}
									>
										✕
									</button>
								)}
							</div>
							{passwordChanged && !formState.smtpPassword && options?.hasSmtpPassword && (
								<label className="label">
									<span className="label-text-alt text-warning">
										{t("mail.passwordWillBeCleared")}
									</span>
								</label>
							)}
						</div>
					</div>
				)}
			</MenuSectionDividerWrapper>

			{/* Security */}
			<MenuSectionDividerWrapper title={t("mail.security")} className="space-y-5">
				<div className="flex items-center justify-between">
					<label>
						<p className="font-medium">{t("mail.verifyCertificate")}</p>
						<p className="text-sm text-gray-500">
							{t("mail.verifyCertificateDescription")}
						</p>
					</label>
					<input
						type="checkbox"
						className="checkbox-primary checkbox checkbox-sm"
						checked={formState.smtpRequireTLS}
						onChange={(e) => handleInputChange("smtpRequireTLS", e.target.checked)}
					/>
				</div>
			</MenuSectionDividerWrapper>

			{/* Save and Test Buttons */}
			<div className="flex flex-wrap gap-3">
				<button
					type="button"
					className="btn btn-primary btn-sm"
					disabled={!hasChanges || isSaving || portValidation?.isError}
					onClick={handleSave}
				>
					{isSaving ? (
						<span className="loading loading-spinner loading-sm" />
					) : (
						t("mail.saveSettings")
					)}
				</button>
				<button
					type="button"
					className="btn btn-sm"
					disabled={
						sendingTestMail || !formState.smtpHost || !formState.smtpEmail || hasChanges
					}
					onClick={() => sendTestMail({ type: MailTemplateKey.Notification })}
				>
					{sendingTestMail ? (
						<span className="loading loading-spinner loading-sm" />
					) : (
						t("mail.sendTestEmail")
					)}
				</button>
				{hasChanges && (
					<span className="text-sm text-warning self-center">
						{t("mail.unsavedChanges")}
					</span>
				)}
			</div>

			{/* Email Templates */}
			<MenuSectionDividerWrapper title={t("mail.emailTemplates")} className="space-y-3">
				<div className="collapse collapse-arrow w-full border border-base-300 bg-base-200">
					<input type="checkbox" />
					<div className="collapse-title">{t("mail.inviteUserTemplate")}</div>
					<div className="collapse-content" style={{ width: "100%" }}>
						<MailUserInviteTemplate />
					</div>
				</div>
				<div className="collapse collapse-arrow w-full border border-base-300 bg-base-200">
					<input type="checkbox" />
					<div className="collapse-title">{t("mail.emailVerificationTemplate")}</div>
					<div className="collapse-content" style={{ width: "100%" }}>
						<VerifyEmailTemplate />
					</div>
				</div>
				<div className="collapse collapse-arrow w-full border border-base-300 bg-base-200">
					<input type="checkbox" />
					<div className="collapse-title">{t("mail.forgotPasswordTemplate")}</div>
					<div className="collapse-content" style={{ width: "100%" }}>
						<ForgotPasswordMailTemplate />
					</div>
				</div>
				<div className="collapse collapse-arrow w-full border border-base-300 bg-base-200">
					<input type="checkbox" />
					<div className="collapse-title">{t("mail.organizationInviteTemplate")}</div>
					<div className="collapse-content" style={{ width: "100%" }}>
						<OrganizationInviteTemplate />
					</div>
				</div>
				<div className="collapse collapse-arrow w-full border border-base-300 bg-base-200">
					<input type="checkbox" />
					<div className="collapse-title">{t("mail.notificationTemplate")}</div>
					<div className="collapse-content" style={{ width: "100%" }}>
						<NotificationTemplate />
					</div>
				</div>
				<div className="collapse collapse-arrow w-full border border-base-300 bg-base-200">
					<input type="checkbox" />
					<div className="collapse-title">{t("mail.newDeviceNotificationTemplate")}</div>
					<div className="collapse-content" style={{ width: "100%" }}>
						<NewDeviceNotificationTemplate />
					</div>
				</div>
				<div className="collapse collapse-arrow w-full border border-base-300 bg-base-200">
					<input type="checkbox" />
					<div className="collapse-title">
						{t("mail.deviceIpChangeNotificationTemplate")}
					</div>
					<div className="collapse-content" style={{ width: "100%" }}>
						<DeviceIpChangeNotificationTemplate />
					</div>
				</div>
			</MenuSectionDividerWrapper>
		</main>
	);
};
Mail.getLayout = function getLayout(page: ReactElement) {
	return <LayoutAdminAuthenticated>{page}</LayoutAdminAuthenticated>;
};

export default Mail;
