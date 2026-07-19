import { useTranslations } from "next-intl";
import { LayoutAdminAuthenticated } from "~/components/layouts/layout";
import { api } from "~/utils/api";
import DebugMirror from "~/components/adminPage/controller/debugController";
import { UnlinkedNetwork } from "~/components/adminPage/controller/unlinkedNetworkTable";
import ZerotierUrl from "~/components/adminPage/controller/zerotierUrl";
import RemoteRoots from "~/components/adminPage/controller/remoteRoots";
import LocalZerotierConfig from "~/components/adminPage/controller/localZerotierConfig";
import { ReactElement } from "react";
import MenuSectionDividerWrapper from "~/components/shared/menuSectionDividerWrapper";

const Controller = () => {
	// const [error, setError] = useState(false);
	const t = useTranslations("admin");

	const { data: controllerData, error: controllerError } =
		api.admin.getControllerStats.useQuery();
	const { data: unlinkedNetworks } = api.admin.unlinkedNetwork.useQuery({
		getDetails: false,
	});

	const { networkCount, totalMembers, controllerStatus, assignedIPs } =
		controllerData || {};

	const { allowManagementFrom, allowTcpFallbackRelay, listeningOn } =
		controllerStatus?.config?.settings || {};

	const { online, tcpFallbackActive, version } = controllerStatus || {};
	const addressClassName =
		"badge badge-primary inline-flex h-auto min-h-6 max-w-full min-w-0 justify-start whitespace-normal break-all px-2 py-1 text-left leading-snug";
	return (
		<main className="grid grid-cols-1 lg:grid-cols-2 w-full bg-base-100 p-5 sm:p-3 space-y-10">
			{controllerError ? (
				<div
					className="col-span-2 space-y-10 xl:w-6/12"
					data-testid="controller-narrow-layout"
				>
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
						<span>{controllerError?.message}</span>
					</div>
					<LocalZerotierConfig />
					<ZerotierUrl />
				</div>
			) : (
				<div
					className="col-span-2 space-y-10 xl:w-6/12"
					data-testid="controller-narrow-layout"
				>
					<MenuSectionDividerWrapper title={t("controller.networkMembers.title")}>
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
						<div className="grid grid-cols-3">
							<div>
								<p>Assigned Network IP's</p>
							</div>
							<div className="col-span-3 ml-auto w-full min-w-0 xl:col-span-2">
								<div className="flex min-w-0 flex-wrap gap-1 xl:justify-end">
									{assignedIPs?.map((ip, index) => (
										// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
										<p key={index} className={addressClassName}>
											{ip}
										</p>
									))}
								</div>
							</div>
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
					</MenuSectionDividerWrapper>
					<MenuSectionDividerWrapper title={t("controller.management.title")}>
						<div className="grid grid-cols-3">
							<p>{t("controller.management.allowManagementFrom")}</p>
							<div className="col-span-2 gap-1 flex flex-col items-end">
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
							<div className="col-span-3 ml-auto w-full min-w-0 xl:col-span-2">
								<div className="flex min-w-0 flex-wrap gap-1 xl:justify-end">
									{listeningOn?.map((address) => (
										<span key={address} className={addressClassName}>
											{address}
										</span>
									))}
								</div>
							</div>
						</div>
					</MenuSectionDividerWrapper>
					<LocalZerotierConfig />
					<MenuSectionDividerWrapper title={t("controller.controllerStatus.title")}>
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
					</MenuSectionDividerWrapper>
					<MenuSectionDividerWrapper title="Debug" className="space-y-5">
						<DebugMirror data={controllerData} title="Controller Status" />
					</MenuSectionDividerWrapper>
					<ZerotierUrl />
				</div>
			)}
			<MenuSectionDividerWrapper
				title={t("controller.remoteRoots.title")}
				className="col-span-2"
			>
				<RemoteRoots />
			</MenuSectionDividerWrapper>
		</main>
	);
};
Controller.getLayout = function getLayout(page: ReactElement) {
	return <LayoutAdminAuthenticated>{page}</LayoutAdminAuthenticated>;
};

export default Controller;
