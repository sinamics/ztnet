import { type ReactElement } from "react";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import { api } from "~/utils/api";
import { useTranslations } from "next-intl";
import {
	useTrpcApiErrorHandler,
	useTrpcApiSuccessHandler,
} from "~/hooks/useTrpcApiHandler";
import MenuSectionDividerWrapper from "~/components/shared/menuSectionDividerWrapper";

const UserSettingsNotification = () => {
	const t = useTranslations();

	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();

	const {
		data: me,
		refetch: refetchMe,
		isLoading: loadingOptions,
	} = api.auth.me.useQuery();

	const { mutate: setUserSettings } = api.auth.updateUserOptions.useMutation({
		onSuccess: handleApiSuccess({ actions: [refetchMe] }),
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
		<main className="flex w-full flex-col bg-base-100 p-5 sm:p-3 space-y-10">
			<MenuSectionDividerWrapper
				title={t("userSettings.notification.devices")}
				className="xl:w-6/12 space-y-5"
			>
				<div className="flex items-center justify-between">
					<div>
						<p>{t("userSettings.notification.newDeviceLogin.title")}</p>
						<p className="text-xs text-gray-500">
							{t("userSettings.notification.newDeviceLogin.description")}
						</p>
					</div>
					<input
						type="checkbox"
						disabled={loadingOptions}
						checked={me?.options?.newDeviceNotification || false}
						className="checkbox-primary checkbox checkbox-sm"
						onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
							setUserSettings({ newDeviceNotification: e.target.checked });
						}}
					/>
				</div>
				<div className="flex items-center justify-between">
					<div>
						<p>{t("userSettings.notification.ipAddressChange.title")}</p>
						<p className="text-xs text-gray-500">
							{t("userSettings.notification.ipAddressChange.description")}
						</p>
					</div>
					<input
						type="checkbox"
						disabled={loadingOptions}
						checked={me?.options?.deviceIpChangeNotification || false}
						className="checkbox-primary checkbox checkbox-sm"
						onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
							setUserSettings({ deviceIpChangeNotification: e.target.checked });
						}}
					/>
				</div>
			</MenuSectionDividerWrapper>
		</main>
	);
};

UserSettingsNotification.getLayout = function getLayout(page: ReactElement) {
	return <LayoutAuthenticated>{page}</LayoutAuthenticated>;
};
export default UserSettingsNotification;
