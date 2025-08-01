import React, { useState, useEffect } from "react";
import { api } from "~/utils/api";
import { toast } from "react-hot-toast";
import cn from "classnames";
import { useTranslations } from "next-intl";
import {
	useTrpcApiErrorHandler,
	useTrpcApiSuccessHandler,
} from "~/hooks/useTrpcApiHandler";
import { useModalStore } from "~/utils/store";

interface ITemplateEditor {
	templateType: string;
	organizationId: string;
}

interface ITemplate {
	subject: string;
	body: string;
}

const OrganizationNotificationTemplateEditor: React.FC<ITemplateEditor> = ({
	templateType,
	organizationId,
}) => {
	const t = useTranslations();
	const { closeModal } = useModalStore();

	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();

	const [changes, setChanges] = useState({
		subject: false,
		body: false,
	});

	const [template, setTemplate] = useState<ITemplate>({
		subject: "",
		body: "",
	});

	// Get organization notification template
	const {
		data: organizationTemplate,
		refetch: refetchTemplate,
		isLoading: loadingTemplate,
	} = api.org.getOrganizationNotificationTemplate.useQuery(
		{
			organizationId,
			templateType,
		},
		{ enabled: !!organizationId && !!templateType },
	);

	// Get default template for fallback
	const { mutate: getDefaultTemplate, data: defaultTemplate } =
		api.org.getDefaultOrganizationNotificationTemplate.useMutation();

	// Update organization notification template
	const { mutate: updateTemplate } =
		api.org.updateOrganizationNotificationTemplate.useMutation({
			onSuccess: handleApiSuccess({
				actions: [refetchTemplate],
				toastMessage: t(
					"organization.settings.notifications.templates.successToastTemplateSaved",
				),
			}),
			onError: handleApiError,
		});

	// Send test notification
	const { mutate: sendTestNotification, isLoading: sendingTest } =
		api.org.sendTestOrganizationNotification.useMutation({
			onSuccess: handleApiSuccess({
				toastMessage: t(
					"organization.settings.notifications.templates.successToastTestSent",
				),
			}),
			onError: handleApiError,
		});

	const changeTemplateHandler = (
		e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
	) => {
		const modifiedValue = e.target.value.replace(/\n/g, "<br />");
		setTemplate({
			...template,
			[e.target.name]: modifiedValue,
		});
	};

	const submitTemplateHandler = () => {
		if (!template.subject || !template.body) {
			return toast.error(t("organization.settings.notifications.templates.errorFields"));
		}

		updateTemplate({
			organizationId,
			templateType,
			template: JSON.stringify(template),
		});
	};

	const resetToDefaultHandler = () => {
		getDefaultTemplate({ templateType });
	};

	const sendTestHandler = () => {
		if (changes.subject || changes.body) {
			return toast.error(
				t("organization.settings.notifications.templates.errorSaveFirst"),
			);
		}

		sendTestNotification({
			organizationId,
			templateType,
		});
	};

	// Load template when modal opens or data changes
	useEffect(() => {
		if (organizationTemplate) {
			setTemplate(organizationTemplate as ITemplate);
		}
	}, [organizationTemplate]);

	// Load default template when received
	useEffect(() => {
		if (defaultTemplate) {
			setTemplate(defaultTemplate);
		}
	}, [defaultTemplate]);

	// Track changes
	useEffect(() => {
		if (!organizationTemplate || !template) return;

		const originalTemplate = organizationTemplate as ITemplate;
		const newChanges = {
			subject: originalTemplate.subject !== template.subject,
			body: originalTemplate.body !== template.body,
		};

		setChanges(newChanges);
	}, [organizationTemplate, template]);

	const getAvailableTags = () => {
		const commonTags = ["organizationName", "adminName", "timestamp"];

		switch (templateType) {
			case "nodeAdded":
			case "nodeDeleted":
			case "nodePermanentlyDeleted":
				return [...commonTags, "nodeName", "nodeId"];
			case "userAdded":
			case "userRemoved":
				return [...commonTags, "userName", "userEmail"];
			case "permissionChanged":
				return [...commonTags, "userName", "userEmail", "oldRole", "newRole"];
			case "networkCreated":
			case "networkDeleted":
				return [...commonTags, "networkName", "networkId"];
			default:
				return commonTags;
		}
	};

	if (loadingTemplate) {
		return (
			<div className="flex justify-center py-8">
				<progress className="progress progress-primary w-56"></progress>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Available Tags */}
			<div className="space-y-2">
				<p className="font-medium">
					{t("organization.settings.notifications.templates.availableTags")}
				</p>
				<div className="flex flex-wrap gap-1">
					{getAvailableTags().map((tag) => (
						<kbd key={tag} className="kbd kbd-sm">
							{tag}
						</kbd>
					))}
				</div>
			</div>

			{/* Subject Field */}
			<div className="form-control w-full">
				<label className="label" htmlFor="subject">
					<span className="label-text">
						{t("organization.settings.notifications.templates.subject")}
					</span>
				</label>
				<input
					type="text"
					id="subject"
					name="subject"
					placeholder={t(
						"organization.settings.notifications.templates.subjectPlaceholder",
					)}
					value={template.subject || ""}
					className={cn("input input-bordered w-full focus:outline-none", {
						"border-2 border-red-500": changes.subject,
					})}
					onChange={changeTemplateHandler}
				/>
			</div>

			{/* Body Field */}
			<div className="form-control w-full">
				<label className="label" htmlFor="body">
					<span className="label-text">
						{t("organization.settings.notifications.templates.htmlBody")}
					</span>
				</label>
				<textarea
					id="body"
					name="body"
					placeholder={t("organization.settings.notifications.templates.bodyPlaceholder")}
					value={template.body?.replace(/<br \/>/g, "\n") || ""}
					className={cn(
						"textarea textarea-bordered w-full border-2 font-medium leading-snug focus:outline-none",
						{ "border-2 border-red-500": changes.body },
					)}
					rows={10}
					onChange={changeTemplateHandler}
				/>
			</div>

			{/* Action Buttons */}
			<div className="flex justify-between pt-4 border-t">
				<div className="space-x-2">
					<button
						type="button"
						className="btn btn-primary btn-sm"
						onClick={submitTemplateHandler}
					>
						{t("organization.settings.notifications.templates.saveTemplate")}
					</button>
					<button
						type="button"
						className="btn btn-outline btn-sm"
						onClick={resetToDefaultHandler}
					>
						{t("organization.settings.notifications.templates.resetToDefault")}
					</button>
				</div>
				<div className="space-x-2">
					<button
						type="button"
						className="btn btn-outline btn-sm"
						disabled={changes.subject || changes.body || sendingTest}
						onClick={sendTestHandler}
					>
						{sendingTest
							? t("organization.settings.notifications.templates.sendingTest")
							: t("organization.settings.notifications.templates.sendTest")}
					</button>
					<button type="button" className="btn btn-ghost btn-sm" onClick={closeModal}>
						{t("commonButtons.cancel")}
					</button>
				</div>
			</div>
		</div>
	);
};

export default OrganizationNotificationTemplateEditor;
