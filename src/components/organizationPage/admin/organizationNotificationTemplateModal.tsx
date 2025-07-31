import React, { useState, useEffect } from "react";
import { api } from "~/utils/api";
import { toast } from "react-hot-toast";
import cn from "classnames";
import { useTranslations } from "next-intl";
import {
	useTrpcApiErrorHandler,
	useTrpcApiSuccessHandler,
} from "~/hooks/useTrpcApiHandler";

interface ITemplateModal {
	isOpen: boolean;
	onClose: () => void;
	templateType: string;
	templateName: string;
	organizationId: string;
}

interface ITemplate {
	subject: string;
	body: string;
}

const OrganizationNotificationTemplateModal: React.FC<ITemplateModal> = ({
	isOpen,
	onClose,
	templateType,
	templateName,
	organizationId,
}) => {
	const t = useTranslations();

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
		{ enabled: !!organizationId && !!templateType && isOpen },
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

	// Reset state when modal closes
	useEffect(() => {
		if (!isOpen) {
			setTemplate({ subject: "", body: "" });
			setChanges({ subject: false, body: false });
		}
	}, [isOpen]);

	const getAvailableTags = () => {
		const commonTags = ["organizationName", "adminName", "timestamp"];

		switch (templateType) {
			case "nodeAdded":
			case "nodeDeleted":
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

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
			<div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
				<div className="p-6">
					<div className="flex justify-between items-center mb-6">
						<h2 className="text-xl font-semibold">
							{t("organization.settings.notifications.templates.editTemplate")} -{" "}
							{templateName}
						</h2>
						<button
							type="button"
							className="text-gray-400 hover:text-gray-600"
							onClick={onClose}
						>
							<svg
								className="w-6 h-6"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>

					{loadingTemplate ? (
						<div className="flex justify-center py-8">
							<progress className="progress progress-primary w-56"></progress>
						</div>
					) : (
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
									placeholder={t(
										"organization.settings.notifications.templates.bodyPlaceholder",
									)}
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
									<button
										type="button"
										className="btn btn-ghost btn-sm"
										onClick={onClose}
									>
										{t("commonButtons.cancel")}
									</button>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default OrganizationNotificationTemplateModal;
