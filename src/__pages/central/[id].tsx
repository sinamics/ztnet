import { useRouter } from "next/router";
import type { ReactElement } from "react";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import { NetworkRoutes } from "~/components/networkByIdPage/networkRoutes/networkRoutes";
import { NetworkMembersTable } from "~/components/networkByIdPage/table/networkMembersTable";
import { api } from "~/utils/api";
import { NetworkIpAssignment } from "~/features/network/components/NetworkIpAssignments";
import { NetworkPrivatePublic } from "~/features/network/components/NetworkPrivatePublic";
import { AddMemberById } from "~/components/networkByIdPage/addMemberById";
import { CopyToClipboard } from "react-copy-to-clipboard";
import CopyIcon from "~/icons/copy";
import toast from "react-hot-toast";
import { useModalStore } from "~/utils/store";
import { CentralFlowRules } from "~/components/networkByIdPage/ztCentral/centralFlowRules";
import { NetworkMulticast } from "~/components/networkByIdPage/networkMulticast";
import cn from "classnames";
import NetworkHelpText from "~/components/networkByIdPage/networkHelp";
import { InviteMemberByMail } from "~/components/networkByIdPage/inviteMemberbyMail";
import { useTranslations } from "next-intl";
import NetworkDescription from "../../components/networkByIdPage/networkDescription";
import NetworkName from "~/components/networkByIdPage/networkName";
import Head from "next/head";
import { NetworkDns } from "~/features/network/components/NetworkDns";
import { getServerSideProps } from "~/server/getServerSideProps";
import useOrganizationWebsocket from "~/hooks/useOrganizationWebsocket";
import NetworkLoadingSkeleton from "~/components/shared/networkLoadingSkeleton";
import NetworkQrCode from "~/components/networkByIdPage/networkQrCode";

const HeadSection = ({ title }: { title: string }) => (
	<Head>
		<title>{title}</title>
		<link rel="icon" href="/favicon.ico" />
		<meta property="og:title" content={title} key={title} />
		<meta name="robots" content="noindex, nofollow" />
	</Head>
);

const CentralNetworkById = ({ orgIds }) => {
	const t = useTranslations();
	// const [state, setState] = useState({
	//   viewZombieTable: false,
	// });
	const callModal = useModalStore((state) => state.callModal);
	const { query, push: router } = useRouter();

	const { data: globalOptions } = api.settings.getAllOptions.useQuery();

	const { mutate: deleteNetwork } = api.network.deleteNetwork.useMutation();
	const {
		data: networkById,
		isLoading: loadingNetwork,
		error: errorNetwork,
	} = api.network.getNetworkById.useQuery(
		{
			nwid: query.id as string,
			central: true,
		},
		{ enabled: !!query.id, refetchInterval: 15000 },
	);

	useOrganizationWebsocket(orgIds);

	const pageTitle = `${globalOptions?.siteName} - ${networkById?.network?.name}`;

	if (loadingNetwork) {
		const pageTitleLoading = `${globalOptions?.siteName}`;
		// add loading progress bar to center of page, vertially and horizontally
		return (
			<>
				<HeadSection title={pageTitleLoading} />
				<NetworkLoadingSkeleton className="w-5/6" />
			</>
		);
	}

	const { network, members = [] } = networkById || {};

	if (errorNetwork) {
		return (
			<>
				<HeadSection title={pageTitle} />
				<div className="flex flex-col items-center justify-center">
					<h1 className="text-center text-2xl font-semibold">{errorNetwork.message}</h1>
					<ul className="list-disc">
						<li>{t("networkById.errorSteps.step1")}</li>
						<li>{t("networkById.errorSteps.step2")}</li>
					</ul>
				</div>
			</>
		);
	}

	return (
		<div>
			<HeadSection title={pageTitle} />
			<div className="mx-auto flex flex-row flex-wrap justify-between space-y-10 p-4 text-sm sm:p-10 md:text-base xl:space-y-0">
				<div className="grid grid-cols-1 xl:grid-cols-[1fr,auto,1fr] gap-10">
					<div className="flex flex-col space-y-3 sm:space-y-0">
						<div className="flex flex-col justify-between sm:flex-row">
							<span className="font-semibold">{t("networkById.networkId")}</span>
							<span className="relative flex items-center gap-2">
								<CopyToClipboard
									text={network?.nwid}
									onCopy={() =>
										toast.success(
											t("commonToast.copyToClipboard.success", {
												element: network?.nwid,
											}),
											{
												id: "copyNwid",
											},
										)
									}
									title={t("commonToast.copyToClipboard.title")}
								>
									<div className="flex cursor-pointer items-center gap-2">
										{network?.nwid}
										<CopyIcon />
									</div>
								</CopyToClipboard>
							</span>
						</div>
						<NetworkName central />
						<NetworkDescription central />
					</div>
					<div className="cursor-pointer">
						<NetworkQrCode networkId={network?.nwid} />
					</div>
					<div>
						<NetworkPrivatePublic central />
					</div>
				</div>
			</div>
			<div className="mx-auto flex px-4 text-sm sm:px-10 md:text-base">
				<div className="flex flex-col justify-between space-y-3 whitespace-nowrap lg:flex-row lg:space-x-3 lg:space-y-0">
					<div>
						<span className="text-muted font-medium">
							{t("networkById.networkStart")}
						</span>{" "}
						<span
							className={cn("badge badge-lg rounded-md", {
								"badge-accent": network?.ipAssignmentPools?.[0]?.ipRangeStart,
							})}
						>
							{network?.ipAssignmentPools?.[0]?.ipRangeStart || t("networkById.notSet")}
						</span>
					</div>
					<div>
						<span className="text-muted font-medium">{t("networkById.networkEnd")}</span>{" "}
						<span
							className={cn("badge badge-lg rounded-md", {
								"badge-accent": network?.ipAssignmentPools?.[0]?.ipRangeEnd,
							})}
						>
							{network?.ipAssignmentPools?.[0]?.ipRangeEnd || t("networkById.notSet")}
						</span>
					</div>
					<div>
						<span className="text-muted font-medium">{t("networkById.networkCidr")}</span>{" "}
						<span
							className={cn("badge badge-lg rounded-md", {
								"badge-accent": network?.routes?.[0]?.target,
							})}
						>
							{network?.routes?.[0]?.target || t("networkById.notSet")}
						</span>
					</div>
				</div>
			</div>
			<div className="divider mx-auto flex px-4 py-4 text-sm sm:px-10 md:text-base">
				{t("networkById.networkSettings")}
			</div>
			<div className="mx-auto grid grid-cols-1 space-y-3 px-4 py-4 text-sm sm:px-10 md:text-base xl:flex xl:space-y-0">
				{/* Ipv4 assignment  */}
				<div className="w-6/6 xl:w-3/6">
					<NetworkIpAssignment central />
				</div>

				<div className="divider col-start-2 hidden lg:divider-horizontal xl:inline-flex"></div>

				{/* Manged routes section */}
				<div className="w-6/6 xl:w-3/6 ">
					<NetworkRoutes central />
				</div>
			</div>
			<div className="mx-auto grid grid-cols-1 space-y-3 px-4 py-4 text-sm sm:px-10 md:text-base xl:flex xl:space-y-0">
				{/* Ipv4 assignment  */}
				<div className="w-6/6 xl:w-3/6">
					{" "}
					<NetworkDns central />{" "}
				</div>

				<div className="divider col-start-2 hidden lg:divider-horizontal xl:inline-flex"></div>

				{/* Manged broadcast section */}
				<div className="w-6/6 xl:w-3/6">
					<NetworkMulticast central />
				</div>
			</div>
			<div className="divider mx-auto flex px-4 py-4 text-sm sm:px-10 md:text-base">
				{t("networkById.networkMembers")}
			</div>
			<div className="mx-auto w-full px-4 py-4 text-sm sm:px-10 md:text-base">
				{members?.length ? (
					<div className="membersTable-wrapper">
						<NetworkMembersTable nwid={network.id} central={true} />
					</div>
				) : (
					<div role="alert" className="alert">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							className="stroke-info shrink-0 w-6 h-6"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
								d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							></path>
						</svg>
						<div className="w-full space-y-5 font-medium tracking-wide">
							<div className="w-full flex justify-center">
								<p>{t("networkById.noMembersInformation.title")}</p>
							</div>
							<div>
								<div className="w-full flex justify-center">
									<p>{t("networkById.noMembersInformation.installZerotier")}</p>
								</div>
								<div className="w-full flex justify-center">
									<CopyToClipboard
										text="curl -s https://install.zerotier.com | sudo bash"
										onCopy={() =>
											toast.success(
												t("commonToast.copyToClipboard.success", { element: "" }),
												{
													id: "copyNwid",
												},
											)
										}
										title={t("commonToast.copyToClipboard.title")}
									>
										<div className="flex cursor-pointer items-center gap-2">
											<kbd className="kbd kbd-md">
												curl -s https://install.zerotier.com | sudo bash
											</kbd>
											<CopyIcon />
										</div>
									</CopyToClipboard>
								</div>
							</div>
							<div>
								<div className="w-full flex justify-center">
									<p>{t("networkById.noMembersInformation.joinNetwork")}</p>
								</div>
								<div className="w-full flex justify-center">
									<CopyToClipboard
										text={`zerotier-cli join ${network.nwid}`}
										onCopy={() =>
											toast.success(
												t("commonToast.copyToClipboard.success", { element: "" }),
												{
													id: "copyNwid",
												},
											)
										}
										title={t("commonToast.copyToClipboard.title")}
									>
										<div className="flex cursor-pointer items-center gap-2">
											<kbd className="kbd kbd-md">zerotier-cli join {network.nwid}</kbd>
											<CopyIcon />
										</div>
									</CopyToClipboard>
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
			<div className="mx-auto grid grid-cols-1 space-y-3 px-4 py-4 text-sm sm:px-10 md:text-base xl:flex xl:space-y-0">
				{/* Ipv4 assignment  */}
				<div className="flex w-full flex-wrap space-x-0 space-y-5 xl:space-x-5 xl:space-y-0">
					<InviteMemberByMail />
					<AddMemberById central />
				</div>
			</div>
			{/* <div className="mx-auto w-full px-4 py-4 text-sm sm:px-10 md:text-base">
        <div className="mb-4 md:mb-0">
          {networkById?.zombieMembers?.length > 0 ? (
            <>
              <button
                onClick={() =>
                  setState({
                    ...state,
                    viewZombieTable: !state.viewZombieTable,
                  })
                }
                className="btn btn-wide"
              >
                View stashed members ({networkById?.zombieMembers?.length})
              </button>

              {state.viewZombieTable ? (
                <div className="membersTable-wrapper text-center">
                  <DeletedNetworkMembersTable nwid={network.id} />
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div> */}

			<div className="mx-auto flex px-4 py-4 text-sm sm:px-10 md:text-base">
				<CentralFlowRules />
			</div>
			<div className="mx-auto flex px-4 py-4 text-sm sm:px-10 md:text-base">
				<NetworkHelpText />
			</div>
			<div className="divider mx-auto flex px-4 py-4 text-sm sm:px-10 md:text-base">
				Network Actions
			</div>
			<div className="mx-auto px-4 py-4 text-sm sm:px-10 md:flex-row md:text-base">
				<div className="flex items-end md:justify-end">
					<button
						onClick={() =>
							callModal({
								title: `${t("commonButtons.deleteNetwork")} ${network.name}`,
								description:
									"Are you sure you want to delete this network? This cannot be undone and all members will be deleted from this network",
								yesAction: () => {
									deleteNetwork(
										{ nwid: network.id, central: true },
										{ onSuccess: () => void router("/central") },
									);
								},
							})
						}
						className="btn btn-error btn-outline btn-wide"
					>
						{t("commonButtons.deleteNetwork")}
					</button>
				</div>
			</div>
		</div>
	);
};

CentralNetworkById.getLayout = function getLayout(page: ReactElement) {
	return <LayoutAuthenticated>{page}</LayoutAuthenticated>;
};

export { getServerSideProps };
export default CentralNetworkById;
