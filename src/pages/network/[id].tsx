import { useRouter } from "next/router";
import { useState, type ReactElement, useEffect, useRef } from "react";
import { LayoutAuthenticated } from "~/components/layouts/layout";
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
import Head from "next/head";
import { globalSiteTitle } from "~/utils/global";
import { getServerSideProps } from "~/server/getServerSideProps";
import useOrganizationWebsocket from "~/hooks/useOrganizationWebsocket";
import NetworkLoadingSkeleton from "~/components/shared/networkLoadingSkeleton";
import { QRCodeSVG } from "qrcode.react";
import daisyuiColors from "daisyui/src/theming/themes";
import { useTheme } from "next-themes";

const HeadSection = ({ title }: { title: string }) => (
	<Head>
		<title>{title}</title>
		<link rel="icon" href="/favicon.ico" />
		<meta property="og:title" content={title} key={title} />
		<meta name="robots" content="noindex, nofollow" />
	</Head>
);

type OrganizationId = {
	id: string;
};
interface IProps {
	orgIds: OrganizationId[];
}

const NetworkById = ({ orgIds }: IProps) => {
	const b = useTranslations("commonButtons");
	const [themeRGBColor, setThemeRGBColor] = useState("");
	const { theme } = useTheme();
	const t = useTranslations("networkById");
	// const { Image } = useQRCode();
	const qrRef = useRef(null);
	const [state, setState] = useState({
		viewZombieTable: false,
		isDebug: false,
	});

	useEffect(() => {
		// console.log(theme);
		// const selectedTheme = document.documentElement.getAttribute("data-theme");
		// Assuming the themes are structured in an array or object
		setThemeRGBColor(daisyuiColors[theme]?.primary);
	}, [theme]);

	useOrganizationWebsocket(orgIds);

	const { callModal } = useModalStore((state) => state);
	const { query, push: router } = useRouter();
	const { mutate: deleteNetwork } = api.network.deleteNetwork.useMutation();
	const {
		data: networkById,
		isLoading: loadingNetwork,
		error: errorNetwork,
	} = api.network.getNetworkById.useQuery(
		{
			nwid: query.id as string,
			central: false,
		},
		{ enabled: !!query.id, refetchInterval: 10000 },
	);
	const { network, members = [] } = networkById || {};
	const pageTitle = `${globalSiteTitle} - ${network?.name}`;
	if (errorNetwork) {
		return (
			<>
				<HeadSection title={pageTitle} />
				<div className="flex flex-col items-center justify-center">
					<h1 className="text-center text-2xl font-semibold">{errorNetwork.message}</h1>
					<ul className="list-disc">
						<li>{t("errorSteps.step1")}</li>
						<li>{t("errorSteps.step2")}</li>
					</ul>
					<div className="w-5/5 divider mx-auto flex px-4 py-4 text-sm sm:w-4/5 sm:px-10 md:text-base">
						Network Actions
					</div>
					<div className="w-5/5 mx-auto px-4 py-4 text-sm sm:w-4/5 sm:px-10 md:flex-row md:text-base">
						<div className="flex items-end md:justify-end">
							<button
								onClick={() =>
									callModal({
										title: `Delete network ${query.id as string}`,
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
								Delete network
							</button>
						</div>
					</div>
				</div>
			</>
		);
	}
	if (loadingNetwork) {
		const pageTitleLoading = `${globalSiteTitle}`;
		// add loading progress bar to center of page, vertially and horizontally
		return (
			<>
				<HeadSection title={pageTitleLoading} />
				<NetworkLoadingSkeleton className="w-5/6" />
			</>
		);
	}
	const svgcopyToClipboard = () => {
		if (qrRef.current) {
			const originalSvgElement = qrRef.current.querySelector("svg");
			if (!originalSvgElement) {
				console.error("QR code SVG element not found");
				return;
			}

			// Serialize and parse the original SVG to ensure a proper clone
			const serializedSvg = new XMLSerializer().serializeToString(originalSvgElement);
			const clonedSvgElement = new DOMParser().parseFromString(
				serializedSvg,
				"image/svg+xml",
			).documentElement;

			// Set the first path element to white
			const firstPath = clonedSvgElement.querySelector("path");
			if (firstPath) {
				firstPath.setAttribute("fill", "#FFFFFF");
			}

			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d");

			const svgBlob = new Blob(
				[new XMLSerializer().serializeToString(clonedSvgElement)],
				{ type: "image/svg+xml" },
			);
			const url = URL.createObjectURL(svgBlob);

			const image = new Image();
			image.onload = () => {
				canvas.width = image.width;
				canvas.height = image.height;
				ctx.drawImage(image, 0, 0);
				URL.revokeObjectURL(url);

				// Convert canvas to PNG
				const pngUrl = canvas.toDataURL("image/png");

				// Create a temporary link to trigger download
				const downloadLink = document.createElement("a");
				downloadLink.href = pngUrl;
				downloadLink.download = `qr-${query.id}.png`;
				document.body.appendChild(downloadLink);
				downloadLink.click();
				document.body.removeChild(downloadLink);
			};

			image.onerror = () => {
				console.error("Error loading SVG image");
				URL.revokeObjectURL(url);
			};

			image.src = url;
		} else {
			console.error("QR ref not found");
		}
	};

	// In your React component
	<button onClick={svgcopyToClipboard}>Download QR Code</button>;

	return (
		<div className="animate-fadeIn">
			<HeadSection title={pageTitle} />
			<div className="w-5/5 mx-auto flex flex-row flex-wrap justify-between space-y-10 p-4 text-sm sm:w-5/6 sm:p-10 md:text-base xl:space-y-0">
				<div className="w-5/5 h-fit w-full xl:w-2/6 ">
					<div className="flex flex-col space-y-3 sm:space-y-0">
						<div className="flex flex-col justify-between sm:flex-row">
							<span className="font-semibold">{t("networkId")}</span>
							<span className="relative flex items-center gap-2">
								<CopyToClipboard
									text={network?.nwid}
									onCopy={() =>
										toast.success(
											t("copyToClipboard.success", { element: network?.nwid }),
											{
												id: "copyNwid",
											},
										)
									}
									title={t("copyToClipboard.title")}
								>
									<div className="flex cursor-pointer items-center gap-2">
										{network?.nwid}
										<CopyIcon />
									</div>
								</CopyToClipboard>
							</span>
						</div>
						<NetworkName />
						<NetworkDescription />
					</div>
				</div>
				<div
					ref={qrRef}
					className="shadow-md cursor-pointer"
					onClick={svgcopyToClipboard}
				>
					<QRCodeSVG
						value={`https://joinzt.com/addnetwork?nwid=${network?.nwid}&v=1`}
						size={100}
						bgColor={themeRGBColor}
						fgColor={"#000000"}
						level={"M"}
						includeMargin={true}
						// imageSettings={{
						// 	src: "https://github.com/sinamics/ztnet/raw/main/docs/images/logo/ztnet_original.png",
						// 	x: undefined,
						// 	y: undefined,
						// 	height: 16,
						// 	width: 16,
						// 	excavate: true,
						// }}
					/>
				</div>
				<div>
					<NetworkPrivatePublic />
				</div>
			</div>
			<div className="w-5/5 mx-auto flex px-4 text-sm sm:w-5/6 sm:px-10 md:text-base">
				<div className="hidden lg:flex flex-col justify-between space-y-3 whitespace-nowrap lg:flex-row lg:space-x-3 lg:space-y-0">
					<div>
						<span className="text-muted font-medium">{t("networkStart")}</span>{" "}
						<span
							className={cn("badge badge-lg rounded-md", {
								"badge-accent": network?.ipAssignmentPools[0]?.ipRangeStart,
							})}
						>
							{network?.ipAssignmentPools[0]?.ipRangeStart || t("notSet")}
						</span>
					</div>
					<div>
						<span className="text-muted font-medium">{t("networkEnd")}</span>{" "}
						<span
							className={cn("badge badge-lg rounded-md", {
								"badge-accent": network?.ipAssignmentPools[0]?.ipRangeEnd,
							})}
						>
							{network?.ipAssignmentPools[0]?.ipRangeEnd || t("notSet")}
						</span>
					</div>
					<div>
						<span className="text-muted font-medium">{t("networkCidr")}</span>{" "}
						<span
							className={cn("badge badge-lg rounded-md", {
								"badge-accent": network?.routes[0]?.target,
							})}
						>
							{network?.routes[0]?.target || t("notSet")}
						</span>
					</div>
				</div>
			</div>
			<div className="w-5/5 divider mx-auto flex px-4 py-4 text-sm sm:w-5/6 sm:px-10 md:text-base">
				{t("networkSettings")}
			</div>
			<div className="w-5/5 mx-auto grid grid-cols-1 space-y-3 px-4 py-4 text-sm sm:w-5/6 sm:px-10 md:text-base xl:flex xl:space-y-0">
				{/* Ipv4 assignment  */}
				<div className="w-6/6 xl:w-3/6">
					<NetworkIpAssignment />
				</div>

				<div className="divider col-start-2 hidden lg:divider-horizontal xl:inline-flex" />

				{/* Manged routes section */}
				<div className="w-6/6 xl:w-3/6 ">
					<NettworkRoutes />
				</div>
			</div>
			<div className="w-5/5 mx-auto grid grid-cols-1 space-y-3 px-4 py-4 text-sm sm:w-5/6 sm:px-10 md:text-base xl:flex xl:space-y-0">
				{/* Ipv4 assignment  */}
				<div className="w-6/6 xl:w-3/6">
					<NetworkDns />
				</div>

				<div className="divider col-start-2 hidden lg:divider-horizontal xl:inline-flex" />

				{/* Manged broadcast section */}
				<div className="w-6/6 xl:w-3/6">
					<NetworkMulticast />
				</div>
			</div>
			<div className="w-5/5 divider mx-auto flex px-4 py-4 text-sm sm:w-5/6 sm:px-10 md:text-base">
				{t("networkMembers")}
			</div>
			<div className="w-5/5 mx-auto w-full px-4 py-4 text-sm sm:w-5/6 sm:px-10 md:text-base">
				{members.length ? (
					<div className="membersTable-wrapper">
						<NetworkMembersTable nwid={network.nwid} central={false} />
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
								<p>{t("noMembersInformation.title")}</p>
							</div>
							<div>
								<div className="w-full flex justify-center">
									<p>{t("noMembersInformation.installZerotier")}</p>
								</div>
								<div className="w-full flex justify-center">
									<CopyToClipboard
										text="curl -s https://install.zerotier.com | sudo bash"
										onCopy={() =>
											toast.success(t("copyToClipboard.success", { element: "" }), {
												id: "copyNwid",
											})
										}
										title={t("copyToClipboard.title")}
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
									<p>{t("noMembersInformation.joinNetwork")}</p>
								</div>
								<div className="w-full flex justify-center">
									<CopyToClipboard
										text={`zerotier-cli join ${network.nwid}`}
										onCopy={() =>
											toast.success(t("copyToClipboard.success", { element: "" }), {
												id: "copyNwid",
											})
										}
										title={t("copyToClipboard.title")}
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
			<div className="w-5/5 mx-auto grid grid-cols-1 space-y-3 px-4 py-4 text-sm sm:w-5/6 sm:px-10 md:text-base xl:flex xl:space-y-0">
				{/* Ipv4 assignment  */}
				<div className="flex w-full flex-wrap space-x-0 space-y-5 xl:space-x-5 xl:space-y-0">
					<InviteMemberByMail />
					<AddMemberById />
				</div>
			</div>
			<div className="w-5/5 mx-auto w-full px-4 py-4 text-sm sm:w-5/6 sm:px-10 md:text-base">
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
								{t("deletedNetworkMembersTable.buttons.viewStashedMembers")} (
								{networkById?.zombieMembers?.length})
							</button>

							{state.viewZombieTable ? (
								<div className="membersTable-wrapper text-center">
									<DeletedNetworkMembersTable nwid={network.nwid} />
								</div>
							) : null}
						</>
					) : null}
				</div>
			</div>
			<div className="w-5/5 mx-auto flex px-4 py-4 text-sm sm:w-5/6 sm:px-10 md:text-base">
				<NetworkHelpText />
			</div>

			<div className="w-5/5 mx-auto flex px-4 py-4 text-sm sm:w-5/6 sm:px-10 md:text-base">
				<NetworkFlowRules />
			</div>
			{/* <div className="w-5/5 divider mx-auto flex px-4 py-4 text-sm sm:w-5/6 sm:px-10 md:text-base">
				DEBUG
			</div>
			<div className="w-5/5 mx-auto px-4 py-4 text-sm sm:w-5/6 sm:px-10 md:text-base space-y-8">
				<DebugMirror data={networkById?.network} title="Controler Networks" />
				<DebugMirror data={networkById?.members} title="Controler Members" />
			</div> */}

			<div className="w-5/5 divider mx-auto flex px-4 py-4 text-sm sm:w-5/6 sm:px-10 md:text-base">
				{t("networkActions")}
			</div>
			<div className="w-5/5 mx-auto px-4 py-4 text-sm sm:w-5/6 sm:px-10 md:flex-row md:text-base">
				<div className="flex items-end md:justify-end">
					<button
						onClick={() =>
							callModal({
								title: t.rich("deleteNetwork.title", {
									networkName: network.name,
								}),
								description: t("deleteNetwork.description"),
								yesAction: () => {
									deleteNetwork(
										{ nwid: network.nwid },
										{ onSuccess: () => void router("/network") },
									);
								},
							})
						}
						className="btn btn-error btn-outline btn-wide"
					>
						{b("deleteNetwork")}
					</button>
				</div>
			</div>
		</div>
	);
};

NetworkById.getLayout = function getLayout(page: ReactElement) {
	return <LayoutAuthenticated>{page}</LayoutAuthenticated>;
};

export { getServerSideProps };
export default NetworkById;
