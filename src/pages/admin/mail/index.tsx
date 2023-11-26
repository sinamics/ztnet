import EditableField from "~/components/elements/inputField";
import { type ReactElement } from "react";
import { LayoutAdminAuthenticated } from "~/components/layouts/layout";
import { api } from "~/utils/api";
import { type GlobalOptions } from "@prisma/client";
import MailUserInviteTemplate from "~/components/adminPage/mail/mailUserInviteTemplate";
import ForgotPasswordMailTemplate from "~/components/adminPage/mail/mailForgotPasswordTemplate";
import NotificationTemplate from "~/components/adminPage/mail/mailNotificationTemplate";
import { useTranslations } from "use-intl";
import OrganizationInviteTemplate from "~/components/adminPage/mail/mailOrganizationInviteTemplate";

const Mail = () => {
	const t = useTranslations("admin");
	const { mutate: setMailOptions } = api.admin.setMail.useMutation();

	const {
		data: options,
		refetch: refetchOptions,
		isLoading: loadingOptions,
	} = api.admin.getAllOptions.useQuery();

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
		<main className="mx-auto flex w-full flex-col justify-center space-y-5 bg-base-100 p-3 sm:w-6/12">
			{options?.error ? (
				<div className="alert alert-warning alert-sm">
					<div className="flex-1">
						<label className="font-medium">Action Required</label>
						<p className="text-sm">{options?.message}</p>
					</div>
				</div>
			) : null}
			<div>
				<p className="text-sm text-gray-400">{t("mail.mailSMTP")}</p>
				<div className="divider mt-0 text-gray-500"></div>
			</div>
			<div className="space-y-5">
				<EditableField
					isLoading={false}
					label={t("mail.smtpHost")}
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
					// buttonClassName="hidden"
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
					// buttonClassName="hidden"
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
					// buttonClassName="hidden"
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
					// buttonClassName="hidden"
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
					<div className="collapse-title">{t("mail.notificationTemplate")}</div>
					<div className="collapse-content" style={{ width: "100%" }}>
						<NotificationTemplate />
					</div>
				</div>
				<div className="collapse-arrow collapse w-full border border-base-300 bg-base-200">
					<input type="checkbox" />
					<div className="collapse-title">Organization Invite</div>
					<div className="collapse-content" style={{ width: "100%" }}>
						<OrganizationInviteTemplate />
					</div>
				</div>
			</div>
		</main>
	);
};
Mail.getLayout = function getLayout(page: ReactElement) {
	return <LayoutAdminAuthenticated>{page}</LayoutAdminAuthenticated>;
};

export default Mail;
