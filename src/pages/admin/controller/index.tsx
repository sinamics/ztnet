import { useTranslations } from "next-intl";
import { useState, type ReactElement } from "react";
import EditableField from "~/components/elements/inputField";
import { LayoutAdminAuthenticated } from "~/components/layouts/layout";
import PrivateRoot from "~/components/adminPage/controller/privateRoot";
import { api } from "~/utils/api";
import DebugMirror from "~/components/adminPage/controller/debugController";
import { UnlinkedNetwork } from "~/components/adminPage/controller/unlinkedNetworkTable";
import { ErrorData, ZodErrorFieldErrors } from "~/types/errorHandling";
import toast from "react-hot-toast";

const Controller = () => {
	const [error, setError] = useState(false);
	const t = useTranslations("admin");
	const { data: controllerData, refetch: refetchStats } =
		api.admin.getControllerStats.useQuery(null, {
			retry: 1,
			onError: () => {
				setError(true);
			},
			onSuccess: () => {
				setError(false);
			},
		});
	const { data: unlinkedNetworks, refetch: refetchUnlinkedNetworks } =
		api.admin.unlinkedNetwork.useQuery();
	const { data: me, refetch: refetchMe, isLoading: meLoading } = api.auth.me.useQuery();
	const { mutate: setZtOptions } = api.auth.setLocalZt.useMutation({
		onSuccess: () => {
			toast.success("Successfully updated ZeroTier options");
			void refetchMe();
			void refetchStats();
		},
		onError: (error) => {
			if ((error.data as ErrorData)?.zodError) {
				const fieldErrors = (error.data as ErrorData)?.zodError
					.fieldErrors as ZodErrorFieldErrors;
				for (const field in fieldErrors) {
					toast.error(`${fieldErrors[field].join(", ")}`);
				}
			} else if (error.message) {
				toast.error(error.message);
			}
		},
	});
	const { networkCount, totalMembers, controllerStatus } = controllerData || {};

	const { allowManagementFrom, allowTcpFallbackRelay, listeningOn } =
		controllerStatus?.config?.settings || {};

	const { online, tcpFallbackActive, version } = controllerStatus || {};

	if (meLoading) return null;

	return (
		<main className="mx-auto flex w-full flex-col justify-center space-y-5 bg-base-100 p-3 sm:w-6/12 pb-80">
			{error ? (
				<div className="alert alert-error">
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
							d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<span>Error! Controller unreachable</span>
				</div>
			) : (
				<>
					<div className="pb-10">
						<p className="text-sm text-gray-400">
							{t("controller.networkMembers.title")}
						</p>
						<div className="divider mt-0 p-0 text-gray-500"></div>
						<div className="flex items-center justify-between">
							<p>{t("controller.networkMembers.totalNetworks")}</p>
							<p>{networkCount}</p>
						</div>
						<div className="flex items-center justify-between">
							<p>{t("controller.networkMembers.totalMembers")}</p>
							<p>{totalMembers}</p>
						</div>
						<div className="flex items-center justify-between">
							<p>{t("controller.networkMembers.totalUnlinkedNetworks")}</p>
							<p>{unlinkedNetworks?.length}</p>
						</div>
						{unlinkedNetworks && unlinkedNetworks?.length > 0 ? (
							<div className="py-4">
								<p>{t("controller.networkMembers.unlinkedNetworks.title")}</p>
								<p className="text-sm text-gray-500 pb-5">
									{t("controller.networkMembers.unlinkedNetworks.description")}
								</p>
								<UnlinkedNetwork />
							</div>
						) : null}
					</div>
					<div className="pb-10">
						<p className="text-sm text-gray-400">{t("controller.management.title")}</p>
						<div className="divider mt-0 p-0 text-gray-500"></div>
						<div className="flex items-center justify-between">
							<p>{t("controller.management.allowManagementFrom")}</p>
							<div className="list-inside list-disc space-x-2">
								{allowManagementFrom?.map((address) => (
									<span key={address}>{address}</span>
								))}
							</div>
						</div>
						<div className="flex items-center justify-between">
							<p>{t("controller.management.allowTcpFallbackRelay")}</p>
							<p>{allowTcpFallbackRelay ? "Yes" : "No"}</p>
						</div>
						<div className="grid grid-cols-3">
							<p>{t("controller.management.listeningOn")}</p>
							<div className="col-span-2 gap-1 flex flex-col items-end">
								{listeningOn?.map((address) => (
									<span key={address}>{address}</span>
								))}
							</div>
						</div>
					</div>
					<div className="pb-10">
						<p className="text-sm text-gray-400">
							{t("controller.controllerStatus.title")}
						</p>
						<div className="divider mt-0 p-0 text-gray-500"></div>

						<div className="flex items-center justify-between">
							<p>{t("controller.controllerStatus.online")}</p>
							<p>{online ? "Yes" : "No"}</p>
						</div>
						<div className="flex items-center justify-between">
							<p>{t("controller.controllerStatus.tcpFallbackActive")}</p>
							<p>{tcpFallbackActive ? "Yes" : "No"}</p>
						</div>
						<div className="flex items-center justify-between">
							<p>{t("controller.controllerStatus.version")}</p>
							<p>{version}</p>
						</div>
					</div>
					<div className="pb-10">
						<p className="text-sm text-gray-400">Debug</p>
						<div className="divider mt-0 p-0 text-gray-500"></div>

						<DebugMirror data={controllerData} title="Controller Status" />
					</div>
				</>
			)}
			<div className="pb-10 border-t border-b border-red-600/25 rounded-md p-2">
				<p className="text-sm text-error">
					{t("controller.controllerConfig.danger_zone")}
				</p>
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

					<EditableField
						isLoading={false}
						label={t("controller.controllerConfig.local_zerotier_url")}
						description={t("controller.controllerConfig.submit_empty_field_default")}
						size="sm"
						disabled={me?.options.urlFromEnv}
						fields={[
							{
								name: "localControllerUrl",
								type: "text",
								placeholder:
									me?.options?.localControllerUrlPlaceholder || "http://zerotier:9993",
								value: me?.options?.localControllerUrl,
							},
						]}
						submitHandler={(params) =>
							new Promise((resolve) => {
								setZtOptions(params);
								refetchUnlinkedNetworks();
								resolve(true);
							})
						}
					/>
					<EditableField
						isLoading={false}
						label={t("controller.controllerConfig.zerotier_secret")}
						description={t("controller.controllerConfig.submit_empty_field_default")}
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
								setZtOptions(params);
								refetchUnlinkedNetworks();
								resolve(true);
							})
						}
					/>
					<div className="divider mt-0 p-0 text-error"></div>
					<PrivateRoot />
				</div>
			</div>
		</main>
	);
};
Controller.getLayout = function getLayout(page: ReactElement) {
	return <LayoutAdminAuthenticated>{page}</LayoutAdminAuthenticated>;
};

export default Controller;
