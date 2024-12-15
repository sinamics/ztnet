import { ReactElement } from "react";
import EditableField from "~/components/elements/inputField";
import { LayoutAdminAuthenticated } from "~/components/layouts/layout";
import { api } from "~/utils/api";
import { useTranslations } from "next-intl";
import {
	useTrpcApiErrorHandler,
	useTrpcApiSuccessHandler,
} from "~/hooks/useTrpcApiHandler";
import MenuSectionDividerWrapper from "~/components/shared/menuSectionDividerWrapper";

const Settings = () => {
	const t = useTranslations("admin");
	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();

	const {
		data: options,
		isLoading: loadingOptions,
		refetch: refetchOptions,
	} = api.admin.getAllOptions.useQuery();

	const { mutate: setWelcomeMessage } = api.admin.updateGlobalOptions.useMutation({
		onSuccess: handleApiSuccess({ actions: [refetchOptions] }),
		onError: handleApiError,
	});

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
			<MenuSectionDividerWrapper
				title={t("settings.application.siteName")}
				className="space-y-5"
			>
				<div className="text-sm text-gray-400">
					<p>{t("settings.application.description")}</p>
				</div>
				<div className="space-y-5">
					<EditableField
						isLoading={false}
						label="Sitename"
						size="sm"
						placeholder={options?.siteName || "ZTNET"}
						fields={[
							{
								name: "siteName",
								description: "Max 50 Char",
								type: "text",
								placeholder: "Write a cool title ....",
								value: options?.siteName,
							},
						]}
						submitHandler={(params) =>
							new Promise((resolve) => {
								setWelcomeMessage(params);
								resolve(true);
							})
						}
					/>
				</div>
			</MenuSectionDividerWrapper>
			<MenuSectionDividerWrapper
				title={t("settings.publicPages.sectionTitle")}
				className="space-y-5"
			>
				<div className="text-sm text-gray-400">
					<p>{t("settings.publicPages.description")}</p>
				</div>
				<div className="space-y-5">
					<EditableField
						isLoading={false}
						label="Title"
						size="sm"
						placeholder={options?.welcomeMessageTitle || "ZTNET"}
						fields={[
							{
								name: "welcomeMessageTitle",
								description: "Max 50 Char",
								type: "text",
								placeholder: "Write a cool title ....",
								value: options?.welcomeMessageTitle,
							},
						]}
						submitHandler={(params) =>
							new Promise((resolve) => {
								setWelcomeMessage(params);
								resolve(true);
							})
						}
					/>
					<EditableField
						isLoading={false}
						label="Content"
						size="sm"
						placeholder={
							options?.welcomeMessageBody ||
							"ZeroTier VPN is your key to boundless connectivity and ultimate privacy.Experience a secure and borderless digital world, free from limitations. Empower yourself with unmatched performance, while safeguarding your data."
						}
						fields={[
							{
								name: "welcomeMessageBody",
								description: "Max 350 Char",
								placeholder: "Write something ....",
								elementType: "textarea",
								value: options?.welcomeMessageBody,
							},
						]}
						submitHandler={(params) =>
							new Promise((resolve) => {
								setWelcomeMessage(params);
								resolve(true);
							})
						}
					/>
				</div>
			</MenuSectionDividerWrapper>
		</main>
	);
};

Settings.getLayout = function getLayout(page: ReactElement) {
	return <LayoutAdminAuthenticated>{page}</LayoutAdminAuthenticated>;
};

export default Settings;
