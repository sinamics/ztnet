import React from "react";
import {
	useTrpcApiErrorHandler,
	useTrpcApiSuccessHandler,
} from "~/hooks/useTrpcApiHandler";
import { api } from "~/utils/api";
import PrivateRoot from "./privateRoot";
import { useTranslations } from "next-intl";
import InputField from "~/components/elements/inputField";

const ZerotierUrl = () => {
	const t = useTranslations("admin");

	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();

	const { refetch: refetchStats } = api.admin.getControllerStats.useQuery();
	const {
		data: controllerOptions,
		refetch: refetchControllerOptions,
		isPending: controllerOptionsLoading,
	} = api.admin.getControllerOptions.useQuery();

	const { mutate: setControllerOptions } = api.admin.setControllerOptions.useMutation({
		onSuccess: handleApiSuccess({
			actions: [refetchControllerOptions, refetchStats],
		}),
		onError: handleApiError,
	});
	return (
		<div className="pb-10 border-t border-b border-red-600/25 rounded-md p-2">
			<p className="text-sm text-error">{t("controller.controllerConfig.danger_zone")}</p>
			<div className="divider mt-0 p-0 text-error"></div>

			<div className="space-y-5">
				<div className="text-sm text-gray-500">
					{t.rich("controller.controllerConfig.proceed_with_caution", {
						span: (content) => <span className="text-error">{content} </span>,
					})}
					{t("controller.controllerConfig.modification_warning")}
					{controllerOptions?.urlFromEnv || controllerOptions?.secretFromEnv ? (
						<div className="alert alert-warning my-5">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="stroke-current shrink-0 h-6 w-6"
								fill="none"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
								/>
							</svg>
							<span className="font-medium">
								{t.rich("controller.controllerConfig.isUsingEnvVariablesAlert", {
									span: (content) => <span className="font-bold">{content} </span>,
								})}
							</span>
						</div>
					) : null}
				</div>

				<InputField
					isLoading={controllerOptionsLoading}
					label={t("controller.controllerConfig.local_zerotier_url")}
					description={t("controller.controllerConfig.submit_empty_field_default")}
					size="sm"
					rootFormClassName="space-y-3 pt-2 w-6/6 sm:w-3/6"
					disabled={controllerOptions?.urlFromEnv}
					fields={[
						{
							name: "localControllerUrl",
							type: "text",
							placeholder:
								controllerOptions?.localControllerUrl ??
								controllerOptions?.defaultLocalControllerUrl,
							value: controllerOptions?.localControllerUrl ?? "",
						},
					]}
					submitHandler={(params) =>
						new Promise((resolve) => {
							setControllerOptions({
								localControllerUrl: params.localControllerUrl as string,
							});
							resolve(true);
						})
					}
				/>
				<InputField
					isLoading={controllerOptionsLoading}
					label={t("controller.controllerConfig.zerotier_secret")}
					description={t("controller.controllerConfig.submit_empty_field_default")}
					rootFormClassName="space-y-3 pt-2 w-6/6 sm:w-3/6"
					size="sm"
					disabled={controllerOptions?.secretFromEnv}
					fields={[
						{
							// the stored secret is never sent to the browser
							name: "localControllerSecret",
							type: "password",
							placeholder: controllerOptions?.hasLocalControllerSecret ? "********" : "",
							value: "",
						},
					]}
					submitHandler={(params) =>
						new Promise((resolve) => {
							setControllerOptions({
								localControllerSecret: params.localControllerSecret as string,
							});
							resolve(true);
						})
					}
				/>
				<div className="divider mt-0 p-0 text-error"></div>
				<PrivateRoot />
			</div>
		</div>
	);
};

export default ZerotierUrl;
