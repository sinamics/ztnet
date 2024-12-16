import { useRouter } from "next/router";
import { useState, type ReactElement } from "react";
import { LayoutOrganizationAuthenticated } from "~/components/layouts/layout";
import { NettworkRoutes } from "~/components/networkByIdPage/networkRoutes";
import { NetworkMembersTable } from "~/components/networkByIdPage/table/networkMembersTable";
import { api } from "~/utils/api";
import { NetworkIpAssignment } from "~/components/networkByIdPage/networkIpAssignments";
import { NetworkPrivatePublic } from "~/components/networkByIdPage/networkPrivatePublic";
import { AddMemberById } from "~/components/networkByIdPage/addMemberById";
import { CopyToClipboard } from "react-copy-to-clipboard";
import CopyIcon from "~/icons/copy";
import toast from "react-hot-toast";
import { DeletedNetworkMembersTable } from "~/components/networkByIdPage/table/deletedNetworkMembersTable";
import { useModalStore } from "~/utils/store";
import { NetworkFlowRules } from "~/components/networkByIdPage/networkFlowRules";
import { NetworkDns } from "~/components/networkByIdPage/networkDns";
import { NetworkMulticast } from "~/components/networkByIdPage/networkMulticast";
import cn from "classnames";
import NetworkHelpText from "~/components/networkByIdPage/networkHelp";
import { InviteMemberByMail } from "~/components/networkByIdPage/inviteMemberbyMail";
import { useTranslations } from "next-intl";
import NetworkName from "~/components/networkByIdPage/networkName";
import NetworkDescription from "~/components/networkByIdPage/networkDescription";
import { getServerSideProps } from "~/server/getServerSideProps";
import useOrganizationWebsocket from "~/hooks/useOrganizationWebsocket";
import NetworkLoadingSkeleton from "~/components/shared/networkLoadingSkeleton";
import HeadSection from "~/components/shared/metaTags";
import NetworkQrCode from "~/components/networkByIdPage/networkQrCode";

type OrganizationId = {
	id: string;
};
interface IProps {
	orgIds: OrganizationId[];
}

const OrganizationNetworkById = ({ orgIds }: IProps) => {
	const t = useTranslations();
	const [state, setState] = useState({
		viewZombieTable: false,
		isDebug: false,
	});
	const callModal = useModalStore((state) => state.callModal);
	const { query, push: router } = useRouter();
	const organizationId = query.orgid as string;

	useOrganizationWebsocket(orgIds);

	const { data: globalOptions } = api.settings.getAllOptions.useQuery();
	const { mutate: deleteNetwork } = api.network.deleteNetwork.useMutation();
	const {
		data: networkById,
		isLoading: loadingNetwork,
		error: errorNetwork,
	} = api.network.getNetworkById.useQuery(
		{
			nwid: query.id as string,
		},
		{ enabled: !!query.id, refetchInterval: 10000 },
	);
	const { network, members = [] } = networkById || {};
	const pageTitle = `${globalOptions?.siteName} - ${network?.name}`;

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
					<div className="w-5/5 divider mx-auto flex  py-4 text-sm sm:w-4/5 md:text-base">
						Network Actions
					</div>
					<div className="w-5/5 mx-auto  py-4 text-sm sm:w-4/5 md:flex-row md:text-base">
						<div className="flex items-end md:justify-end">
							<button
								onClick={() =>
									callModal({
										title: `${t("commonButtons.deleteNetwork")}: ${query.id as string}`,
										description:
											"Are you sure you want to delete this network? This cannot be undone and all members will be deleted from this network",
										yesAction: () => {
											deleteNetwork(
												{ nwid: query.id as string },
												{ onSuccess: () => void router("/network") },
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
			</>
		);
	}

	if (loadingNetwork) {
		const pageTitleLoading = `${globalOptions?.siteName}`;
		// add loading progress bar to center of page, vertially and horizontally
		return (
			<>
				<HeadSection title={pageTitleLoading} />
				<NetworkLoadingSkeleton className="w-6/6" />
			</>
		);
	}

	return (
		<div className="animate-fadeIn">
			<HeadSection title={pageTitle} />
			<div className="mx-auto text-sm sm:py-10 md:text-base">
				<div className="grid grid-cols-1 xl:grid-cols-[1fr,auto,1fr] gap-10">
					{/* Left section with network ID, name, and description */}
					<div className="space-y-1">
						{/* Network ID */}
						<div className="flex flex-col sm:flex-row justify-between">
							<span className="font-semibold">{t("networkById.networkId")}</span>
							<span className="flex items-center">
								<CopyToClipboard
									text={network?.nwid}
									onCopy={() =>
										toast.success(
											t("commonToast.copyToClipboard.success", {
												element: network?.nwid,
											}),
											{ id: "copyNwid" },
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
						{/* Network Name */}
						<NetworkName organizationId={organizationId} />
						{/* Network Description */}
						<NetworkDescription organizationId={organizationId} />
					</div>
					<div className="cursor-pointer">
						<NetworkQrCode networkId={network?.nwid} />
					</div>
					{/* Right section with NetworkPrivatePublic */}
					<div>
						<NetworkPrivatePublic organizationId={organizationId} />
					</div>
				</div>
			</div>

			<div className="w-5/5 mx-auto flex  text-sm md:text-base">
				<div className="hidden lg:flex flex-col justify-between space-y-3 whitespace-nowrap lg:flex-row lg:space-x-3 lg:space-y-0">
					<div>
						<span className="text-muted font-medium">
							{t("networkById.networkStart")}
						</span>{" "}
						<span
							className={cn("badge badge-lg rounded-md", {
								"badge-accent": network?.ipAssignmentPools[0]?.ipRangeStart,
							})}
						>
							{network?.ipAssignmentPools[0]?.ipRangeStart || t("networkById.notSet")}
						</span>
					</div>
					<div>
						<span className="text-muted font-medium">{t("networkById.networkEnd")}</span>{" "}
						<span
							className={cn("badge badge-lg rounded-md", {
								"badge-accent": network?.ipAssignmentPools[0]?.ipRangeEnd,
							})}
						>
							{network?.ipAssignmentPools[0]?.ipRangeEnd || t("networkById.notSet")}
						</span>
					</div>
					<div>
						<span className="text-muted font-medium">{t("networkById.networkCidr")}</span>{" "}
						<span
							className={cn("badge badge-lg rounded-md", {
								"badge-accent": network?.routes[0]?.target,
							})}
						>
							{network?.routes[0]?.target || t("networkById.notSet")}
						</span>
					</div>
				</div>
			</div>
			<div className="w-5/5 divider mx-auto flex  py-4 text-sm md:text-base">
				{t("networkById.networkSettings")}
			</div>
			<div className="w-5/5 mx-auto grid grid-cols-1 space-y-3  py-4 text-sm md:text-base xl:flex xl:space-y-0">
				{/* Ipv4 assignment  */}
				<div className="w-6/6 xl:w-3/6">
					<NetworkIpAssignment organizationId={organizationId} />
				</div>

				<div className="divider col-start-2 hidden lg:divider-horizontal xl:inline-flex" />

				{/* Manged routes section */}
				<div className="w-6/6 xl:w-3/6 ">
					<NettworkRoutes organizationId={organizationId} />
				</div>
			</div>
			<div className="w-5/5 mx-auto grid grid-cols-1 space-y-3  py-4 text-sm md:text-base xl:flex xl:space-y-0">
				{/* Ipv4 assignment  */}
				<div className="w-6/6 xl:w-3/6">
					<NetworkDns organizationId={organizationId} />
				</div>

				<div className="divider col-start-2 hidden lg:divider-horizontal xl:inline-flex" />

				{/* Manged broadcast section */}
				<div className="w-6/6 xl:w-3/6">
					<NetworkMulticast organizationId={organizationId} />
				</div>
			</div>
			<div className="w-5/5 divider mx-auto flex  py-4 text-sm md:text-base">
				{t("networkById.networkMembers")}
			</div>
			<div className="w-5/5 mx-auto w-full  py-4 text-sm md:text-base">
				{members.length ? (
					<div className="membersTable-wrapper">
						<NetworkMembersTable
							nwid={network.nwid}
							central={false}
							organizationId={organizationId}
						/>
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
			<div className="w-5/5 mx-auto grid grid-cols-1 space-y-3  py-4 text-sm md:text-base xl:flex xl:space-y-0">
				{/* Ipv4 assignment  */}
				<div className="flex w-full flex-wrap space-x-0 space-y-5 xl:space-x-5 xl:space-y-0">
					<InviteMemberByMail organizationId={organizationId} />
					<AddMemberById organizationId={organizationId} />
				</div>
			</div>
			<div className="w-5/5 mx-auto w-full  py-4 text-sm md:text-base">
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
								{t("networkById.deletedNetworkMembersTable.buttons.viewStashedMembers")} (
								{networkById?.zombieMembers?.length})
							</button>

							{state.viewZombieTable ? (
								<div className="membersTable-wrapper text-center">
									<DeletedNetworkMembersTable
										nwid={network.nwid}
										organizationId={organizationId}
									/>
								</div>
							) : null}
						</>
					) : null}
				</div>
			</div>
			<div className="w-5/5 mx-auto flex  py-4 text-sm md:text-base">
				<NetworkHelpText />
			</div>

			<div className="w-5/5 mx-auto flex  py-4 text-sm md:text-base">
				<NetworkFlowRules organizationId={organizationId} />
			</div>
			{/* <div className="w-5/5 divider mx-auto flex  py-4 text-sm md:text-base">
				DEBUG
			</div>
			<div className="w-5/5 mx-auto  py-4 text-sm md:text-base space-y-8">
				<DebugMirror data={networkById?.network} title="Controler Networks" />
				<DebugMirror data={networkById?.members} title="Controler Members" />
			</div> */}

			<div className="w-5/5 divider mx-auto flex  py-4 text-sm md:text-base">
				Network Actions
			</div>
			<div className="w-5/5 mx-auto  py-4 text-sm md:flex-row md:text-base">
				<div className="flex items-end md:justify-end">
					<button
						onClick={() =>
							callModal({
								title: `${t("commonButtons.deleteNetwork")}: ${network.name}`,
								description:
									"Are you sure you want to delete this network? This cannot be undone and all members will be deleted from this network",
								yesAction: () => {
									deleteNetwork(
										{ nwid: network.nwid, organizationId },
										{ onSuccess: () => void router(`/organization/${organizationId}`) },
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

OrganizationNetworkById.getLayout = function getLayout(page: ReactElement) {
	return <LayoutOrganizationAuthenticated>{page}</LayoutOrganizationAuthenticated>;
};

export { getServerSideProps };
export default OrganizationNetworkById;
