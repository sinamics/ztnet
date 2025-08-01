import { type ReactElement, useState } from "react";
import { LayoutOrganizationAuthenticated } from "~/components/layouts/layout";
import { api } from "~/utils/api";
import { useTranslations } from "next-intl";
import {
	useTrpcApiErrorHandler,
	useTrpcApiSuccessHandler,
} from "~/hooks/useTrpcApiHandler";
import MenuSectionDividerWrapper from "~/components/shared/menuSectionDividerWrapper";
import { useRouter } from "next/router";
import HeadSection from "~/components/shared/metaTags";
import { useModalStore } from "~/utils/store";
import OrganizationNotificationTemplateEditor from "~/components/organizationPage/admin/organizationNotificationTemplateEditor";
import EditIcon from "~/icons/edit";

const OrganizationNotification = () => {
	const t = useTranslations();
	const router = useRouter();
	const organizationId = router.query.orgid as string;

	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();

	const { callModal } = useModalStore();

	const {
		data: settings,
		refetch: refetchSettings,
		isLoading: loadingSettings,
	} = api.org.getOrganizationSettings.useQuery({
		organizationId,
	});

	const { data: globalOptions } = api.settings.getAllOptions.useQuery();

	const { mutate: updateSettings } =
		api.org.updateOrganizationNotificationSettings.useMutation({
			onSuccess: handleApiSuccess({ actions: [refetchSettings] }),
			onError: handleApiError,
		});

	const openTemplateModal = (templateType: string, templateName: string) => {
		callModal({
			title: `${t("organization.settings.notifications.templates.editTemplate")} - ${templateName}`,
			content: (
				<OrganizationNotificationTemplateEditor
					templateType={templateType}
					organizationId={organizationId}
				/>
			),
			showButtons: false,
			rootStyle: "max-w-4xl w-full",
		});
	};

	const pageTitle = `${globalOptions?.siteName} - Organization Notifications`;

	if (loadingSettings) {
		return (
			<div className="flex flex-col items-center justify-center">
				<h1 className="text-center text-2xl font-semibold">
					<progress className="progress progress-primary w-56"></progress>
				</h1>
			</div>
		);
	}

	return (
		<main className="flex w-full flex-col bg-base-100 p-5 sm:p-3 space-y-10">
			<HeadSection title={pageTitle} />
			{/* Node Notifications */}
			<MenuSectionDividerWrapper
				title={t("organization.settings.notifications.nodeEvents.title")}
				className="xl:w-6/12 space-y-5"
			>
				<div className="flex items-center justify-between">
					<div>
						<p className="font-medium">
							{t("organization.settings.notifications.nodeEvents.nodeAdded.title")}
						</p>
						<p className="text-xs text-gray-500">
							{t("organization.settings.notifications.nodeEvents.nodeAdded.description")}
						</p>
					</div>
					<div className="flex items-center space-x-2">
						<EditIcon
							className="hover:text-primary-focus"
							onClick={() =>
								openTemplateModal(
									"nodeAdded",
									t("organization.settings.notifications.nodeEvents.nodeAdded.title"),
								)
							}
						/>
						<input
							type="checkbox"
							disabled={loadingSettings}
							checked={settings?.nodeAddedNotification || false}
							className="checkbox-primary checkbox checkbox-sm"
							onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
								updateSettings({
									organizationId,
									nodeAddedNotification: e.target.checked,
								});
							}}
						/>
					</div>
				</div>

				<div className="flex items-center justify-between">
					<div>
						<p className="font-medium">
							{t("organization.settings.notifications.nodeEvents.nodeDeleted.title")}
						</p>
						<p className="text-xs text-gray-500">
							{t(
								"organization.settings.notifications.nodeEvents.nodeDeleted.description",
							)}
						</p>
					</div>
					<div className="flex items-center space-x-2">
						<EditIcon
							className="hover:text-primary-focus"
							onClick={() =>
								openTemplateModal(
									"nodeDeleted",
									t("organization.settings.notifications.nodeEvents.nodeDeleted.title"),
								)
							}
						/>
						<input
							type="checkbox"
							disabled={loadingSettings}
							checked={settings?.nodeDeletedNotification || false}
							className="checkbox-primary checkbox checkbox-sm"
							onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
								updateSettings({
									organizationId,
									nodeDeletedNotification: e.target.checked,
								});
							}}
						/>
					</div>
				</div>

				<div className="flex items-center justify-between">
					<div>
						<p className="font-medium">
							{t(
								"organization.settings.notifications.nodeEvents.nodePermanentlyDeleted.title",
							)}
						</p>
						<p className="text-xs text-gray-500">
							{t(
								"organization.settings.notifications.nodeEvents.nodePermanentlyDeleted.description",
							)}
						</p>
					</div>
					<div className="flex items-center space-x-2">
						<EditIcon
							className="hover:text-primary-focus"
							onClick={() =>
								openTemplateModal(
									"nodePermanentlyDeleted",
									t(
										"organization.settings.notifications.nodeEvents.nodePermanentlyDeleted.title",
									),
								)
							}
						/>
						<input
							type="checkbox"
							disabled={loadingSettings}
							checked={settings?.nodePermanentlyDeletedNotification || false}
							className="checkbox-primary checkbox checkbox-sm"
							onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
								updateSettings({
									organizationId,
									nodePermanentlyDeletedNotification: e.target.checked,
								});
							}}
						/>
					</div>
				</div>
			</MenuSectionDividerWrapper>

			{/* User Events */}
			<MenuSectionDividerWrapper
				title={t("organization.settings.notifications.userEvents.title")}
				className="xl:w-6/12 space-y-5"
			>
				<div className="flex items-center justify-between">
					<div>
						<p className="font-medium">
							{t("organization.settings.notifications.userEvents.userAdded.title")}
						</p>
						<p className="text-xs text-gray-500">
							{t("organization.settings.notifications.userEvents.userAdded.description")}
						</p>
					</div>
					<div className="flex items-center space-x-2">
						<EditIcon
							className="hover:text-primary-focus"
							onClick={() =>
								openTemplateModal(
									"userAdded",
									t("organization.settings.notifications.userEvents.userAdded.title"),
								)
							}
						/>
						<input
							type="checkbox"
							disabled={loadingSettings}
							checked={settings?.userAddedNotification || false}
							className="checkbox-primary checkbox checkbox-sm"
							onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
								updateSettings({
									organizationId,
									userAddedNotification: e.target.checked,
								});
							}}
						/>
					</div>
				</div>

				<div className="flex items-center justify-between">
					<div>
						<p className="font-medium">
							{t("organization.settings.notifications.userEvents.userRemoved.title")}
						</p>
						<p className="text-xs text-gray-500">
							{t(
								"organization.settings.notifications.userEvents.userRemoved.description",
							)}
						</p>
					</div>
					<div className="flex items-center space-x-2">
						<EditIcon
							className="hover:text-primary-focus"
							onClick={() =>
								openTemplateModal(
									"userRemoved",
									t("organization.settings.notifications.userEvents.userRemoved.title"),
								)
							}
						/>
						<input
							type="checkbox"
							disabled={loadingSettings}
							checked={settings?.userRemovedNotification || false}
							className="checkbox-primary checkbox checkbox-sm"
							onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
								updateSettings({
									organizationId,
									userRemovedNotification: e.target.checked,
								});
							}}
						/>
					</div>
				</div>

				<div className="flex items-center justify-between">
					<div>
						<p className="font-medium">
							{t(
								"organization.settings.notifications.userEvents.permissionChanged.title",
							)}
						</p>
						<p className="text-xs text-gray-500">
							{t(
								"organization.settings.notifications.userEvents.permissionChanged.description",
							)}
						</p>
					</div>
					<div className="flex items-center space-x-2">
						<EditIcon
							className="hover:text-primary-focus"
							onClick={() =>
								openTemplateModal(
									"permissionChanged",
									t(
										"organization.settings.notifications.userEvents.permissionChanged.title",
									),
								)
							}
						/>
						<input
							type="checkbox"
							disabled={loadingSettings}
							checked={settings?.permissionChangedNotification || false}
							className="checkbox-primary checkbox checkbox-sm"
							onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
								updateSettings({
									organizationId,
									permissionChangedNotification: e.target.checked,
								});
							}}
						/>
					</div>
				</div>
			</MenuSectionDividerWrapper>

			{/* Network Events */}
			<MenuSectionDividerWrapper
				title={t("organization.settings.notifications.networkEvents.title")}
				className="xl:w-6/12 space-y-5"
			>
				<div className="flex items-center justify-between">
					<div>
						<p className="font-medium">
							{t(
								"organization.settings.notifications.networkEvents.networkCreated.title",
							)}
						</p>
						<p className="text-xs text-gray-500">
							{t(
								"organization.settings.notifications.networkEvents.networkCreated.description",
							)}
						</p>
					</div>
					<div className="flex items-center space-x-2">
						<EditIcon
							className="hover:text-primary-focus"
							onClick={() =>
								openTemplateModal(
									"networkCreated",
									t(
										"organization.settings.notifications.networkEvents.networkCreated.title",
									),
								)
							}
						/>
						<input
							type="checkbox"
							disabled={loadingSettings}
							checked={settings?.networkCreatedNotification || false}
							className="checkbox-primary checkbox checkbox-sm"
							onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
								updateSettings({
									organizationId,
									networkCreatedNotification: e.target.checked,
								});
							}}
						/>
					</div>
				</div>

				<div className="flex items-center justify-between">
					<div>
						<p className="font-medium">
							{t(
								"organization.settings.notifications.networkEvents.networkDeleted.title",
							)}
						</p>
						<p className="text-xs text-gray-500">
							{t(
								"organization.settings.notifications.networkEvents.networkDeleted.description",
							)}
						</p>
					</div>
					<div className="flex items-center space-x-2">
						<EditIcon
							className="hover:text-primary-focus"
							onClick={() =>
								openTemplateModal(
									"networkDeleted",
									t(
										"organization.settings.notifications.networkEvents.networkDeleted.title",
									),
								)
							}
						/>
						<input
							type="checkbox"
							disabled={loadingSettings}
							checked={settings?.networkDeletedNotification || false}
							className="checkbox-primary checkbox checkbox-sm"
							onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
								updateSettings({
									organizationId,
									networkDeletedNotification: e.target.checked,
								});
							}}
						/>
					</div>
				</div>
			</MenuSectionDividerWrapper>

			{/* Email Delivery Settings */}
			<MenuSectionDividerWrapper
				title={t("organization.settings.notifications.emailSettings.title")}
				className="xl:w-6/12 space-y-5"
			>
				<div className="text-sm text-gray-500 mb-4">
					<p>{t("organization.settings.notifications.emailSettings.description")}</p>
				</div>

				<div className="flex items-center justify-between py-3">
					<div>
						<p className="font-medium">
							{t("organization.settings.notifications.emailSettings.enableEmails.title")}
						</p>
						<p className="text-xs text-gray-500">
							{t(
								"organization.settings.notifications.emailSettings.enableEmails.description",
							)}
						</p>
					</div>
					<input
						type="checkbox"
						disabled={loadingSettings}
						checked={settings?.emailNotificationsEnabled || false}
						className="checkbox-primary checkbox checkbox-sm"
						onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
							updateSettings({
								organizationId,
								emailNotificationsEnabled: e.target.checked,
							});
						}}
					/>
				</div>
			</MenuSectionDividerWrapper>
		</main>
	);
};

OrganizationNotification.getLayout = function getLayout(page: ReactElement) {
	return <LayoutOrganizationAuthenticated>{page}</LayoutOrganizationAuthenticated>;
};

export default OrganizationNotification;
