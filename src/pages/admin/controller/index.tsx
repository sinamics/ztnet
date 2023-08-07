import { useTranslations } from "next-intl";
import { type ReactElement } from "react";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import { api } from "~/utils/api";

const Controller = () => {
	const t = useTranslations("admin");
	const { data: controllerData, isLoading } =
		api.admin.getControllerStats.useQuery();

	const { networkCount, totalMembers, controllerStatus } = controllerData || {};

	const { allowManagementFrom, allowTcpFallbackRelay, listeningOn } =
		controllerStatus?.config?.settings || {};

	const { online, tcpFallbackActive, version } = controllerStatus || {};

	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center">
				<h1 className="text-center text-2xl font-semibold">
					<progress className="progress progress-primary w-56"></progress>
				</h1>
			</div>
		);
	}
	return (
		<main className="mx-auto flex w-full flex-col justify-center space-y-5 bg-base-100 p-3 sm:w-6/12">
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
			</div>
			<div className="pb-10">
				<p className="text-sm text-gray-400">
					{t("controller.management.title")}
				</p>
				<div className="divider mt-0 p-0 text-gray-500"></div>
				<div className="flex items-center justify-between">
					<p>{t("controller.management.allowManagementFrom")}</p>
					<div className="list-inside list-disc">
						{allowManagementFrom.map((address) => (
							<span key={address}>{address}</span>
						))}
					</div>
				</div>
				<div className="flex items-center justify-between">
					<p>{t("controller.management.allowTcpFallbackRelay")}</p>
					<p>{allowTcpFallbackRelay ? "Yes" : "No"}</p>
				</div>
				<div className="flex items-center justify-between">
					<p>{t("controller.management.listeningOn")}</p>
					<div className="list-inside list-disc space-x-2">
						{listeningOn.map((address) => (
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
		</main>
	);
};
Controller.getLayout = function getLayout(page: ReactElement) {
	return <LayoutAuthenticated>{page}</LayoutAuthenticated>;
};

export default Controller;
