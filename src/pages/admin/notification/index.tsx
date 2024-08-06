import { type ReactElement } from "react";
import { LayoutAdminAuthenticated } from "~/components/layouts/layout";
import { api } from "~/utils/api";
import { useTranslations } from "next-intl";
import {
	useTrpcApiErrorHandler,
	useTrpcApiSuccessHandler,
} from "~/hooks/useTrpcApiHandler";
import MenuSectionDividerWrapper from "~/components/shared/menuSectionDividerWrapper";

const Notification = () => {
	const t = useTranslations("admin");

	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();

	const {
		data: options,
		refetch: refetchOptions,
		isLoading: loadingOptions,
	} = api.admin.getAllOptions.useQuery();

	const { mutate: setRegistration } = api.admin.updateGlobalOptions.useMutation({
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
		<main className="flex w-full flex-col bg-base-100 p-5 sm:p-3 space-y-10">
			<MenuSectionDividerWrapper
				title={t("notification.authentication")}
				className="xl:w-6/12 space-y-5"
			>
				<div className="flex items-center justify-between">
					<div>
						<p>{t("notification.whenUserRegister")}</p>
						<p className="text-xs text-gray-500">
							{t("notification.allAdminsNotification")}
						</p>
					</div>
					<input
						type="checkbox"
						disabled={loadingOptions}
						checked={options?.userRegistrationNotification || false}
						className="checkbox-primary checkbox checkbox-sm"
						onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
							setRegistration({ userRegistrationNotification: e.target.checked });
						}}
					/>
				</div>
			</MenuSectionDividerWrapper>
		</main>
	);
};

Notification.getLayout = function getLayout(page: ReactElement) {
	return <LayoutAdminAuthenticated>{page}</LayoutAdminAuthenticated>;
};
export default Notification;
