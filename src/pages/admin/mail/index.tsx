import EditableField from "~/components/elements/inputField";
import { type ReactElement } from "react";
import { LayoutAdminAuthenticated } from "~/components/layouts/layout";
import { api } from "~/utils/api";
import { type GlobalOptions } from "@prisma/client";
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

const Mail = () => {
	const t = useTranslations("admin");

	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();

	const {
		data: options,
		refetch: refetchOptions,
		isLoading: loadingOptions,
	} = api.admin.getAllOptions.useQuery();

	const { mutate: setMailOptions } = api.admin.setMail.useMutation({
		onSuccess: handleApiSuccess({
			actions: [refetchOptions],
		}),
		onError: handleApiError,
	});

	const inputHandler = (e: Partial<GlobalOptions>) => {
		return new Promise((resolve) => {
			setMailOptions(e, {
				onSuccess: () => {
					void refetchOptions();
					resolve({ success: true });
				},
			});
		});
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
		<main className="flex w-full flex-col justify-center space-y-5 bg-base-100 p-5 sm:p-3 xl:w-6/12">
			{options?.error ? (
				<div className="alert alert-warning alert-sm">
					<div className="flex-1">
						<label className="font-medium">Action Required</label>
						<p className="text-sm">{options?.message}</p>
					</div>
				</div>
			) : null}
			<MenuSectionDividerWrapper title={t("mail.mailSMTP")} className="space-y-5">
				<EditableField
					isLoading={false}
					label={t("mail.smtpHost")}
					rootFormClassName="space-y-3 pt-2 w-6/6 sm:w-3/6"
					// buttonClassName="hidden"
					size="sm"
					fields={[
						{
							name: "smtpHost",
							type: "text",
							placeholder: options?.smtpHost || "host.smtp.com",
							value: options?.smtpHost,
						},
					]}
					submitHandler={async (params) => await inputHandler(params)}
				/>

				<EditableField
					isLoading={false}
					label={t("mail.smtpPort")}
					rootFormClassName="space-y-3 pt-2 w-6/6 sm:w-3/6"
					size="sm"
					fields={[
						{
							name: "smtpPort",
							type: "number",
							placeholder: options?.smtpPort || "587",
							value: options?.smtpPort,
						},
					]}
					submitHandler={(params) => inputHandler(params)}
				/>

				<EditableField
					isLoading={false}
					label={t("mail.senderEmail")}
					rootFormClassName="space-y-3 pt-2 w-6/6 sm:w-3/6"
					size="sm"
					fields={[
						{
							name: "smtpEmail",
							type: "text",
							placeholder: options?.smtpEmail || t("mail.mailPlaceholder"),
							value: options?.smtpEmail,
						},
					]}
					submitHandler={(params) => inputHandler(params)}
				/>

				<EditableField
					isLoading={false}
					label={t("mail.username")}
					rootFormClassName="space-y-3 pt-2 w-6/6 sm:w-3/6"
					size="sm"
					fields={[
						{
							name: "smtpUsername",
							type: "text",
							placeholder: options?.smtpUsername || t("mail.username"),
							value: options?.smtpUsername,
						},
					]}
					submitHandler={(params) => inputHandler(params)}
				/>

				<EditableField
					isLoading={false}
					label={t("mail.password")}
					rootFormClassName="space-y-3 pt-2 w-6/6 sm:w-3/6"
					size="sm"
					fields={[
						{
							name: "smtpPassword",
							type: "password",
							placeholder: "******",
							value: options?.smtpPassword,
						},
					]}
					submitHandler={(params) => inputHandler(params)}
				/>

				<div className="flex items-center justify-between pb-10">
					<p className="font-medium">{t("mail.useSSL")}</p>
					<input
						type="checkbox"
						checked={options?.smtpUseSSL || false}
						className="checkbox-primary checkbox checkbox-sm"
						onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
							void inputHandler({ smtpUseSSL: e.target.checked });
						}}
					/>
				</div>
				<div className="collapse collapse-arrow w-full border border-base-300 bg-base-200">
					<input type="checkbox" />
					<div className="collapse-title">{t("mail.inviteUserTemplate")}</div>
					<div className="collapse-content" style={{ width: "100%" }}>
						<MailUserInviteTemplate />
					</div>
				</div>
				<div className="collapse-arrow collapse w-full border border-base-300 bg-base-200">
					<input type="checkbox" />
					<div className="collapse-title">{t("mail.forgotPasswordTemplate")}</div>
					<div className="collapse-content" style={{ width: "100%" }}>
						<ForgotPasswordMailTemplate />
					</div>
				</div>
				<div className="collapse-arrow collapse w-full border border-base-300 bg-base-200">
					<input type="checkbox" />
					<div className="collapse-title">{t("mail.organizationInviteTemplate")}</div>
					<div className="collapse-content" style={{ width: "100%" }}>
						<OrganizationInviteTemplate />
					</div>
				</div>
				<div className="collapse-arrow collapse w-full border border-base-300 bg-base-200">
					<input type="checkbox" />
					<div className="collapse-title">{t("mail.notificationTemplate")}</div>
					<div className="collapse-content" style={{ width: "100%" }}>
						<NotificationTemplate />
					</div>
				</div>
				<div className="collapse-arrow collapse w-full border border-base-300 bg-base-200">
					<input type="checkbox" />
					<div className="collapse-title">{t("mail.newDeviceNotificationTemplate")}</div>
					<div className="collapse-content" style={{ width: "100%" }}>
						<NewDeviceNotificationTemplate />
					</div>
				</div>
				<div className="collapse-arrow collapse w-full border border-base-300 bg-base-200">
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
