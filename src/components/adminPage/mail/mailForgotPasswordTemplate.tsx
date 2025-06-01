/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect } from "react";
import { api } from "~/utils/api";
import { toast } from "react-hot-toast";
import cn from "classnames";
import { useTranslations } from "next-intl";
import {
	useTrpcApiErrorHandler,
	useTrpcApiSuccessHandler,
} from "~/hooks/useTrpcApiHandler";
import { MailTemplateKey } from "~/utils/enums";

type InviteUserTemplate = {
	subject: string;
	body: string;
};

const ForgotPasswordMailTemplate = () => {
	const t = useTranslations("admin");

	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();

	const [changes, setChanges] = useState({
		subject: false,
		body: false,
	});

	const [emailTemplate, setEmailTemplate] = useState({
		subject: "",
		body: "",
	});
	// get default mail template
	const {
		data: mailTemplates,
		refetch: refetchMailTemplates,
		isLoading: loadingTemplates,
	} = api.admin.getMailTemplates.useQuery({
		template: MailTemplateKey.ForgotPassword,
	});

	const changeTemplateHandler = (
		e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
	) => {
		const modifiedValue = e.target.value.replace(/\n/g, "<br />");
		setEmailTemplate({
			...emailTemplate,
			[e.target.name]: modifiedValue,
		});
	};

	const { mutate: sendTestMail, isLoading: sendingMailLoading } =
		api.admin.sendTestMail.useMutation({
			onError: handleApiError,
			onSuccess: handleApiSuccess({
				toastMessage: t("mail.templates.successToastMailSent"),
			}),
		});

	const { mutate: setMailTemplates } = api.admin.setMailTemplates.useMutation();

	const { mutate: getDefaultMailTemplate, data: defaultTemplates } =
		api.admin.getDefaultMailTemplate.useMutation();

	useEffect(() => {
		if (!defaultTemplates) return;

		setEmailTemplate(defaultTemplates);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [defaultTemplates]);

	useEffect(() => {
		const forgotPasswordTemplate = mailTemplates as InviteUserTemplate;
		setEmailTemplate(forgotPasswordTemplate);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [mailTemplates]);

	useEffect(() => {
		const keysToCompare = ["subject", "body"]; // Add more keys as needed

		const inviteUserTemplate = mailTemplates as InviteUserTemplate;
		if (!inviteUserTemplate || !emailTemplate) return;

		const newChanges = keysToCompare.reduce(
			(acc, key) => {
				const val1 = inviteUserTemplate?.[key] as string;
				const val2 = emailTemplate[key] as string;

				// Here we just compare strings directly, you could add more complex comparison logic if needed
				acc[key] = val1 !== val2;

				return acc;
			},
			{ subject: false, body: false },
		);

		setChanges(newChanges);
	}, [mailTemplates, emailTemplate]);

	const submitTemplateHandler = () => {
		if (!emailTemplate.subject || !emailTemplate.body) {
			return toast.error(t("mail.templates.errorFields"));
		}

		setMailTemplates(
			{
				template: JSON.stringify(emailTemplate),
				type: MailTemplateKey.ForgotPassword,
			},
			{
				onSuccess: () => {
					toast.success(t("mail.templates.successToastTemplateSaved"));
					void refetchMailTemplates();
				},
			},
		);
	};

	if (loadingTemplates) {
		return (
			<div className="flex flex-col items-center justify-center">
				<h1 className="text-center text-2xl font-semibold">
					<progress className="progress progress-primary w-56"></progress>
				</h1>
			</div>
		);
	}
	return (
		<div>
			<div className="space-y-3">
				<p className="font-medium">
					{t("mail.templates.availableTags")}
					<span className="text-primary flex gap-1">
						<kbd className="kbd kbd-sm">toEmail</kbd>
						<kbd className="kbd kbd-sm">forgotLink</kbd>
					</span>
				</p>
				<div className="form-control w-full">
					<label className="label" htmlFor="subject">
						<span className="label-text">{t("mail.templates.subject")}</span>
					</label>
					<input
						type="text"
						placeholder={t("mail.templates.inputPlaceholderSubject")}
						value={emailTemplate?.subject || ""}
						name="subject"
						className={cn("input input-bordered w-full focus:outline-hidden", {
							"border-2 border-red-500": changes?.subject,
						})}
						onChange={changeTemplateHandler}
					/>
				</div>
				<div className="form-control w-full">
					<label className="label" htmlFor="body">
						<span className="label-text">{t("mail.templates.htmlBody")}</span>
					</label>
					<textarea
						value={emailTemplate?.body?.replace(/<br \/>/g, "\n") || ""}
						className={cn(
							"custom-scrollbar textarea textarea-bordered w-full border-2 font-medium leading-snug focus:outline-hidden",
							{ "border-2 border-red-500": changes.body },
						)}
						placeholder={t("mail.templates.textareaPlaceholderBody")}
						rows={10}
						name="body"
						onChange={changeTemplateHandler}
					></textarea>
				</div>
			</div>
			<div className="flex justify-between p-5">
				<div className="space-x-2">
					<button
						className="btn btn-primary btn-sm"
						onClick={() => submitTemplateHandler()}
					>
						{t("mail.templates.saveTemplateButton")}
					</button>
					<button
						className="btn btn-sm"
						onClick={() =>
							getDefaultMailTemplate({
								template: MailTemplateKey.ForgotPassword,
							})
						}
					>
						{t("mail.templates.resetButton")}
					</button>
				</div>
				<div className="flex justify-end">
					<button
						className="btn btn-sm"
						disabled={changes.subject || changes.body || sendingMailLoading}
						onClick={() => sendTestMail({ type: MailTemplateKey.ForgotPassword })}
					>
						{sendingMailLoading
							? t("mail.templates.sendTestMailButtonLoading")
							: t("mail.templates.sendTestMailButton")}
					</button>
				</div>
			</div>
		</div>
	);
};

export default ForgotPasswordMailTemplate;
