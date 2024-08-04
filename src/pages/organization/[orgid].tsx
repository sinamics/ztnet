import { useRouter } from "next/router";
import { useEffect, type ReactElement, useState } from "react";
import { LayoutOrganizationAuthenticated } from "~/components/layouts/layout";
import { api } from "~/utils/api";
import { OrganizationNetworkTable } from "~/components/organization/networkTable";
import { stringToColor } from "~/utils/randomColor";
import { useModalStore } from "~/utils/store";
import TimeAgo from "react-timeago";
import EditOrganizationUserModal from "~/components/organization/editUserModal";
import { useTranslations } from "next-intl";
import { getServerSideProps } from "~/server/getServerSideProps";
import useOrganizationWebsocket from "~/hooks/useOrganizationWebsocket";
import MetaTags from "~/components/shared/metaTags";
import NetworkLoadingSkeleton from "~/components/shared/networkLoadingSkeleton";
import { globalSiteTitle } from "~/utils/global";
import cn from "classnames";
import {
	useTrpcApiErrorHandler,
	useTrpcApiSuccessHandler,
} from "~/hooks/useTrpcApiHandler";

const title = `${globalSiteTitle} - Organization`;

const OrganizationById = ({ user, orgIds }) => {
	const b = useTranslations("commonButtons");
	const t = useTranslations("organization");
	const [maxHeight, setMaxHeight] = useState("auto");
	const { query, push } = useRouter();
	const organizationId = query.orgid as string;
	const callModal = useModalStore((state) => state.callModal);

	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();

	useOrganizationWebsocket(orgIds);

	const { data: meOrgRole } = api.org.getOrgUserRoleById.useQuery({
		organizationId,
		userId: user.id,
	});

	const {
		data: orgData,
		refetch: refecthOrg,
		isLoading: orgLoading,
		error: getOrgError,
	} = api.org.getOrgById.useQuery({
		organizationId,
	});

	const { data: orgUsers } = api.org.getOrgUsers.useQuery({
		organizationId,
	});
	const { mutate: createNetwork } = api.org.createOrgNetwork.useMutation({
		onError: handleApiError,
		onSuccess: (createdNetwork) => {
			if (createdNetwork?.id) {
				return void push(`/organization/${organizationId}/${createdNetwork.id}`);
			}
			void handleApiSuccess({ actions: [refecthOrg] });
		},
	});

	useEffect(() => {
		const calculateMaxHeight = () => {
			const offset = 400;
			const calculatedHeight = window.innerHeight - offset;
			setMaxHeight(`${calculatedHeight}px`);
		};

		// Calculate on mount
		calculateMaxHeight();

		// Recalculate on window resize
		window.addEventListener("resize", calculateMaxHeight);

		// Cleanup listener
		return () => window.removeEventListener("resize", calculateMaxHeight);
	}, []);

	if (getOrgError) {
		return (
			<>
				<div className="flex flex-col items-center justify-center">
					<h1 className="text-center text-2xl font-semibold">{getOrgError.message}</h1>
					<ul className="list-disc">
						<li>{t("errors.getOrgError")}</li>
					</ul>
				</div>
			</>
		);
	}
	if (orgLoading) {
		return (
			<>
				<MetaTags title={title} />
				<NetworkLoadingSkeleton />
			</>
		);
	}

	const truncatedOrgName =
		orgData.orgName.length > 20 ? `${orgData.orgName.slice(0, 20)}...` : orgData.orgName;
	return (
		<main className="w-full bg-base-100 py-2 animate-fadeIn">
			<MetaTags title={title} />
			<div>
				<div className="pb-3">
					{orgData?.description ? (
						<div
							className="border-l-4 border-primary p-2 leading-snug"
							style={{ caretColor: "transparent" }}
						>
							{/* add newline support if description has newlines */}
							{orgData?.description.split("\n").map((str, index) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
								<p key={index}>{str}</p>
							))}
						</div>
					) : null}
				</div>
				<div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
					{/* Organization Users */}
					<section className="bg-base-200 rounded-lg shadow-lg overflow-hidden">
						<div className="p-4">
							<h2 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2">
								{t("membersSection.title")}
							</h2>
							<ul
								style={{ maxHeight: maxHeight }}
								className="divide-y divide-gray-700 overflow-auto custom-scrollbar"
							>
								{orgUsers?.map((user) => {
									const userColor = stringToColor(user.name);
									return (
										<li
											key={user.id}
											className={cn(
												"py-2 px-3 hover:bg-gray-700 transition duration-150",
												{ "cursor-pointer": meOrgRole?.role === "ADMIN" },
											)}
											onClick={() => {
												if (meOrgRole?.role !== "ADMIN") return;
												callModal({
													title: (
														<p>
															{t("membersSection.editUser")}
															<span className="text-primary px-1">{user.name}</span>
														</p>
													),
													content: (
														<EditOrganizationUserModal
															user={user}
															organizationId={organizationId}
														/>
													),
												});
											}}
										>
											<div className="flex items-center space-x-3">
												<div
													style={{ backgroundColor: userColor }}
													className="h-9 w-9 rounded-full flex items-center justify-center text-lg font-semibold uppercase opacity-70"
												>
													{user.name[0]}
												</div>
												<div>
													<p className="font-medium">{user.name}</p>
													<p className="text-sm text-gray-400">
														{user.id === orgData.ownerId ? "OWNER" : user?.role}
													</p>
												</div>
											</div>
										</li>
									);
								})}
							</ul>
						</div>
					</section>

					{/* Organization Information */}
					<section className="bg-base-200 rounded-lg shadow-lg p-4">
						<h2 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2">
							{t("informationSection.title")}
						</h2>
						<ul className="space-y-2">
							<li className="flex justify-between">
								<span className="font-medium">{t("informationSection.name")}</span>
								<span>{truncatedOrgName}</span>
							</li>
							<li className="flex justify-between">
								<span className="font-medium">{t("informationSection.created")}</span>
								<span>
									<TimeAgo date={orgData?.createdAt} />
								</span>
							</li>
							<li className="flex justify-between">
								<span className="font-medium">{t("informationSection.members")}</span>
								<span>{orgData?.users.length}</span>
							</li>
							<li className="flex justify-between">
								<span className="font-medium">
									{t("informationSection.pendingInvitations")}
								</span>
								<span>{orgData?.invitations.length}</span>
							</li>
						</ul>
					</section>

					{/* Network Table and Add Network Button */}
					<section className="col-span-1 md:col-span-2 bg-base-200 rounded-lg shadow-lg p-3">
						<div className="py-1 flex justify-between items-center border-b border-gray-700">
							<h2 className="text-xl font-semibold">{t("networkSection.title")}</h2>
							<button
								className="btn btn-primary btn-sm btn-outline font-semibold px-4 rounded-lg flex items-center"
								onClick={() =>
									createNetwork(
										{
											orgName: orgData?.orgName,
											organizationId,
										},
										{
											onSuccess: () => {
												refecthOrg();
											},
										},
									)
								}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									fill="none"
									strokeWidth="1.5"
									stroke="currentColor"
									className="h-6 w-6 mr-2"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M12 4.5v15m7.5-7.5h-15"
									/>
								</svg>
								{b("addNetwork")}
							</button>
						</div>
						<div className="p-1">
							{orgData?.networks && orgData.networks.length > 0 ? (
								<OrganizationNetworkTable tableData={orgData.networks} />
							) : (
								<div className="text-center text-gray-500 py-10">
									<p>{t("networkSection.noNetworksToShow")}</p>
								</div>
							)}
						</div>
					</section>
				</div>
			</div>
		</main>
	);
};

OrganizationById.getLayout = function getLayout(page: ReactElement) {
	return <LayoutOrganizationAuthenticated>{page}</LayoutOrganizationAuthenticated>;
};

export { getServerSideProps };
export default OrganizationById;
