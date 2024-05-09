import { useTranslations } from "next-intl";
import { LayoutAdminAuthenticated } from "~/components/layouts/layout";
import { api } from "~/utils/api";
import DebugMirror from "~/components/adminPage/controller/debugController";
import { UnlinkedNetwork } from "~/components/adminPage/controller/unlinkedNetworkTable";
import ZerotierUrl from "~/components/adminPage/controller/zerotierUrl";
import { ReactElement } from "react";

const Controller = () => {
	// const [error, setError] = useState(false);
	const t = useTranslations("admin");

	const { data: controllerData, error: controllerError } =
		api.admin.getControllerStats.useQuery();
	const { data: unlinkedNetworks } = api.admin.unlinkedNetwork.useQuery();

	const { networkCount, totalMembers, controllerStatus, assignedIPs } =
		controllerData || {};

	const { allowManagementFrom, allowTcpFallbackRelay, listeningOn } =
		controllerStatus?.config?.settings || {};

	const { online, tcpFallbackActive, version } = controllerStatus || {};

	return (
		<main className="flex w-full flex-col justify-center space-y-5 bg-base-100 p-3 sm:w-6/12 pb-80">
			{controllerError ? (
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
						<div className="grid grid-cols-3">
							<div>
								<p>Assigned Network IP's</p>
							</div>
							<div className="col-span-3 xl:col-span-2 ml-auto">
								<div className="grid grid-cols-2 gap-1">
									{assignedIPs?.map((ip, index) => (
										// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
										<p key={index} className="badge badge-primary">
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
					</div>
					<div className="pb-10">
						<p className="text-sm text-gray-400">{t("controller.management.title")}</p>
						<div className="divider mt-0 p-0 text-gray-500"></div>
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
							<div className="col-span-3 xl:col-span-2 ml-auto">
								<div className="grid grid-cols-2 gap-1">
									{listeningOn?.map((address) => (
										<span key={address} className="w-full badge badge-primary text-left">
											{address}
										</span>
									))}
								</div>
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
			<ZerotierUrl />
		</main>
	);
};
Controller.getLayout = function getLayout(page: ReactElement) {
	return <LayoutAdminAuthenticated>{page}</LayoutAdminAuthenticated>;
};

export default Controller;
