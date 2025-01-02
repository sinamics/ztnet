import { toast } from "react-hot-toast";
import { api } from "~/utils/api";
import cn from "classnames";
import { useState } from "react";
import { RoutesEntity, type IpAssignmentPoolsEntity } from "~/types/local/network";
import { useTranslations } from "next-intl";
import {
	useTrpcApiErrorHandler,
	useTrpcApiSuccessHandler,
} from "~/hooks/useTrpcApiHandler";
import { useModalStore } from "~/utils/store";
import Link from "next/link";
import { useParams } from "next/navigation";

interface IProp {
	central?: boolean;
	organizationId?: string;
}

export const Ipv4Assignment = ({ central = false, organizationId }: IProp) => {
	const t = useTranslations("networkById");
	const callModal = useModalStore((state) => state.callModal);

	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();

	const urlParams = useParams();

	const [ipRange, setIpRange] = useState({ rangeStart: "", rangeEnd: "" });
	const [ipTabs, setIptabs] = useState({ easy: true, advanced: false });
	const {
		data: networkByIdQuery,
		isLoading,
		refetch: refecthNetworkById,
	} = api.network.getNetworkById.useQuery(
		{
			nwid: urlParams.id as string,
			central,
		},
		{ enabled: !!urlParams.id },
	);

	const { mutate: enableIpv4AutoAssign } = api.network.enableIpv4AutoAssign.useMutation({
		onError: handleApiError,
		onSuccess: handleApiSuccess({ actions: [refecthNetworkById] }),
	});
	const { mutate: easyIpAssignment } = api.network.easyIpAssignment.useMutation({
		onError: handleApiError,
		onSuccess: handleApiSuccess({ actions: [refecthNetworkById] }),
	});

	const { mutate: advancedIpAssignment } = api.network.advancedIpAssignment.useMutation({
		onError: handleApiError,
		onSuccess: handleApiSuccess({ actions: [refecthNetworkById] }),
	});

	const rangeChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
		setIpRange({ ...ipRange, [e.target.name]: e.target.value });
	};

	const deleteIpRange = (poolToDelete: IpAssignmentPoolsEntity) => {
		const { network } = networkByIdQuery;
		const newIpAssignmentPools = network.ipAssignmentPools.filter(
			(pool) =>
				pool.ipRangeStart !== poolToDelete?.ipRangeStart ||
				pool.ipRangeEnd !== poolToDelete?.ipRangeEnd,
		);

		advancedIpAssignment({
			updateParams: {
				ipAssignmentPools: newIpAssignmentPools,
			},
			organizationId,
			nwid: urlParams.id as string,
			central,
		});
	};

	const submitIpRange = (e: React.MouseEvent<HTMLButtonElement>) => {
		e.preventDefault();
		if (!ipRange.rangeStart || !ipRange.rangeEnd) {
			void toast.error(t("networkIpAssignments.ipv4.please_enter_valid_ip_range"));
			return;
		}

		const { network } = networkByIdQuery || {};

		// Check if the IP range already exists in the network's ipAssignmentPools
		if (network?.ipAssignmentPools && network?.ipAssignmentPools.length > 0) {
			for (const existingRange of network.ipAssignmentPools) {
				if (
					existingRange?.ipRangeStart === ipRange.rangeStart &&
					existingRange?.ipRangeEnd === ipRange.rangeEnd
				) {
					void toast.error(t("networkIpAssignments.ipv4.ip_range_already_exists"));
					return;
				}
			}
		}

		advancedIpAssignment(
			{
				updateParams: {
					ipAssignmentPools: [
						...(network?.ipAssignmentPools ? network.ipAssignmentPools : []),
						{ ipRangeStart: ipRange.rangeStart, ipRangeEnd: ipRange.rangeEnd },
					],
				},
				organizationId,
				nwid: urlParams.id as string,
				central,
			},
			{
				onSuccess: () => {
					setIpRange({ rangeStart: "", rangeEnd: "" });
				},
			},
		);
	};
	const { network } = networkByIdQuery || {};
	if (isLoading) return <div>Loading</div>;

	return (
		<div>
			{/* if  network.duplicateRoutes.length > 0 show badge */}
			{network?.duplicateRoutes?.length > 0 ? (
				<div role="alert" className="alert bg-base-100 mb-5">
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
					<span>
						{t.rich("networkIpAssignments.ipv4.duplicateIpNotification.title", {
							count: network?.duplicateRoutes?.length,
						})}
					</span>
					<div>
						<button
							onClick={() => {
								// Extract IP addresses from duplicate routes
								// const duplicateIPs = network?.duplicateRoutes.map((duplicateRoute) =>
								// 	duplicateRoute.duplicatedIPs.join(", "),
								// );

								callModal({
									title: (
										<p>
											{t("networkIpAssignments.ipv4.duplicateIpNotification.modal.title")}
										</p>
									),
									content: (
										<div>
											<p className="pb-3">
												{t.rich(
													"networkIpAssignments.ipv4.duplicateIpNotification.modal.description",
													{
														name: network?.name,
													},
												)}
											</p>
											{network?.duplicateRoutes?.map((duplicateNetwork) => (
												<div key={duplicateNetwork.nwid}>
													<p>
														<span className="uppercase mr-1">
															<Link
																href={`/network/${duplicateNetwork.nwid}`}
																className="text-primary"
															>
																{duplicateNetwork.name}
															</Link>
														</span>
														{duplicateNetwork.duplicatedIPs}.
													</p>
												</div>
											))}
										</div>
									),
								});
							}}
							className="btn btn-sm btn-primary"
						>
							More Info
						</button>
					</div>
				</div>
			) : null}
			<div className="flex items-center gap-4">
				<p>{t("networkIpAssignments.ipv4.auto_assign_from_range")}</p>
				<input
					type="checkbox"
					data-testid="auto-assign-checkbox"
					checked={network?.v4AssignMode?.zt || false}
					className="checkbox-primary checkbox checkbox-sm"
					onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
						enableIpv4AutoAssign({
							nwid: urlParams.id as string,
							central,
							organizationId,
							updateParams: {
								v4AssignMode: { zt: e.target.checked },
							},
						});
					}}
				/>
			</div>
			{network?.v4AssignMode?.zt ? (
				<div className="tabs-boxed tabs grid grid-cols-2 gap-5 pb-5">
					<a
						className={cn("tab w-full border border-gray-500", {
							"tab-active border-none": ipTabs.easy,
						})}
						onClick={() =>
							setIptabs((prev) => ({
								...prev,
								advanced: false,
								easy: true,
							}))
						}
					>
						{t("networkIpAssignments.ipv4.easy")}
					</a>
					<a
						className={cn("tab w-full border border-gray-500", {
							"tab-active border-none": ipTabs.advanced,
						})}
						onClick={() =>
							setIptabs((prev) => ({
								...prev,
								easy: false,
								advanced: true,
							}))
						}
					>
						{t("networkIpAssignments.ipv4.advanced")}
					</a>
				</div>
			) : null}
			{network?.v4AssignMode?.zt && ipTabs.easy ? (
				<div
					className={cn("grid cursor-pointer w-full gap-2", {
						"pointer-events-none cursor-no-drop text-gray-500 opacity-25":
							!network?.v4AssignMode?.zt,
					})}
					style={{
						gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
					}}
				>
					{network?.cidr?.map((cidr: string) => {
						return (network?.routes as RoutesEntity[])?.some(
							(route) => route.target === cidr,
						) ? (
							<div
								key={cidr}
								className={cn(
									"badge badge-ghost badge-outline badge-lg rounded-md text-xs opacity-30 md:text-base",
									{
										"badge badge-lg rounded-md bg-primary text-xs text-white opacity-70 md:text-base":
											network?.v4AssignMode?.zt,
									},
									"flex items-center justify-center w-full",
								)}
							>
								{cidr}
							</div>
						) : (
							<div
								key={cidr}
								onClick={() =>
									easyIpAssignment({
										updateParams: {
											routes: [{ target: cidr, via: "" }],
										},
										organizationId,
										nwid: urlParams.id as string,
										central,
									})
								}
								className={cn(
									"badge badge-ghost badge-outline badge-lg rounded-md text-xs opacity-30 md:text-base",
									{ "hover:bg-primary": network?.v4AssignMode?.zt },
									"flex items-center justify-center w-full",
								)}
							>
								{cidr}
							</div>
						);
					})}
				</div>
			) : null}

			{network?.v4AssignMode?.zt && ipTabs.advanced ? (
				<div className="mt-4 space-y-2">
					{network?.ipAssignmentPools?.map((pool) => {
						return (
							<div
								key={pool.ipRangeStart}
								className={
									"badge badge-primary badge-lg flex w-64 min-w-fit flex-wrap rounded-md"
								}
							>
								<div className="cursor-pointer">
									{pool.ipRangeStart} - {pool.ipRangeEnd}
								</div>

								<div title={t("networkIpAssignments.ipv4.delete_ip_assignment")}>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										strokeWidth="1.5"
										stroke="currentColor"
										className="z-10 ml-4 h-4 w-4 cursor-pointer text-warning"
										onClick={() => deleteIpRange(pool)}
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
										/>
									</svg>
								</div>
							</div>
						);
					})}
					<form className="grid grid-cols-2 gap-5 pt-4">
						<div className="form-control w-full">
							<label className="label">
								<span className="label-text">
									{t("networkIpAssignments.ipv4.range_start")}
								</span>
							</label>
							<input
								type="text"
								name="rangeStart"
								value={ipRange.rangeStart}
								onChange={rangeChangeHandler}
								placeholder={t("networkIpAssignments.ipv4.range_start_placeholder")}
								className="input input-bordered input-sm w-full"
							/>
						</div>
						<div className="form-control ">
							<label className="label">
								<span className="label-text">
									{t("networkIpAssignments.ipv4.range_end")}
								</span>
							</label>
							<div className="join">
								<input
									type="text"
									name="rangeEnd"
									value={ipRange.rangeEnd}
									onChange={rangeChangeHandler}
									className="input join-item input-sm w-full input-bordered"
									placeholder={t("networkIpAssignments.ipv4.range_end_placeholder")}
								/>
							</div>
						</div>
						<div className="col-span-2">
							<button
								type="submit"
								onClick={submitIpRange}
								className="btn btn-sm btn-active"
							>
								{t("networkIpAssignments.ipv4.submit")}
							</button>
						</div>
					</form>
				</div>
			) : null}
		</div>
	);
};
