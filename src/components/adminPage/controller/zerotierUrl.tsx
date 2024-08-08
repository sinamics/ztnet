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
	const { data: me, refetch: refetchMe, isLoading: meLoading } = api.auth.me.useQuery();

	const { mutate: setZtOptions } = api.auth.setLocalZt.useMutation({
		onSuccess: handleApiSuccess({
			actions: [refetchMe, refetchStats],
		}),
		onError: handleApiError,
	});
	return (
		<div className="pb-10 border-t border-b border-red-600/25 rounded-md p-2">
			<p className="text-sm text-error">{t("controller.controllerConfig.danger_zone")}</p>
			<div className="divider mt-0 p-0 text-error"></div>

			<div className="space-y-5">
				<p className="text-sm text-gray-500">
					{t.rich("controller.controllerConfig.proceed_with_caution", {
						span: (content) => <span className="text-error">{content} </span>,
					})}
					{t("controller.controllerConfig.modification_warning")}
					{me?.options.urlFromEnv || me?.options.secretFromEnv ? (
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
					) : (
						"nope"
					)}
				</p>

				<InputField
					isLoading={meLoading}
					label={t("controller.controllerConfig.local_zerotier_url")}
					description={t("controller.controllerConfig.submit_empty_field_default")}
					size="sm"
					rootFormClassName="space-y-3 pt-2 w-6/6 sm:w-3/6"
					disabled={me?.options.urlFromEnv}
					fields={[
						{
							name: "localControllerUrl",
							type: "text",
							placeholder: me?.options?.localControllerUrl,
							value: me?.options?.localControllerUrl,
						},
					]}
					submitHandler={(params) =>
						new Promise((resolve) => {
							setZtOptions({
								localControllerSecret: me?.options?.localControllerSecret,
								...params,
							});
							resolve(true);
						})
					}
				/>
				<InputField
					isLoading={meLoading}
					label={t("controller.controllerConfig.zerotier_secret")}
					description={t("controller.controllerConfig.submit_empty_field_default")}
					rootFormClassName="space-y-3 pt-2 w-6/6 sm:w-3/6"
					size="sm"
					disabled={me?.options.secretFromEnv}
					fields={[
						{
							name: "localControllerSecret",
							type: "text",
							placeholder: me?.options?.localControllerSecret || "********",
							value: me?.options?.localControllerSecret || "",
						},
					]}
					submitHandler={(params) =>
						new Promise((resolve) => {
							setZtOptions({
								localControllerUrl: me?.options?.localControllerUrl,
								...params,
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
