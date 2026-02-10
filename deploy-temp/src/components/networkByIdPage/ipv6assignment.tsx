import { Address4 } from "ip-address";
import { useTranslations } from "next-intl";
import { useRouter } from "next/router";
import { useState } from "react";
import toast from "react-hot-toast";
import {
	useTrpcApiErrorHandler,
	useTrpcApiSuccessHandler,
} from "~/hooks/useTrpcApiHandler";
import { IpAssignmentPoolsEntity } from "~/types/local/network";
import { api } from "~/utils/api";

interface IProp {
	central?: boolean;
	organizationId?: string;
}

export const Ipv6assignment = ({ central = false, organizationId }: IProp) => {
	const [ipRange, setIpRange] = useState({ rangeStart: "", rangeEnd: "" });
	const t = useTranslations("networkById");

	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();
	const utils = api.useUtils();

	const { query } = useRouter();
	const { data: networkByIdQuery, refetch: refecthNetworkById } =
		api.network.getNetworkById.useQuery(
			{
				nwid: query.id as string,
				central,
			},
			{ enabled: !!query.id },
		);

	const { mutate: setIpv6 } = api.network.ipv6.useMutation({
		onError: handleApiError,
		onSuccess: async () => {
			await utils.network.getNetworkById.invalidate({
				nwid: query.id as string,
				central,
			});
			handleApiSuccess({
				actions: [refecthNetworkById],
				// toastMessage: t("networkIpAssignments.ipv6.rfc4193Updated"),
			})();
		},
	});

	const { mutate: advancedIpAssignment } = api.network.advancedIpAssignment.useMutation({
		onError: handleApiError,
		onSuccess: async () => {
			await utils.network.getNetworkById.invalidate({
				nwid: query.id as string,
				central,
			});
			handleApiSuccess({ actions: [refecthNetworkById] })();
		},
	});

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
				nwid: query.id as string,
				central,
			},
			{
				onSuccess: () => {
					setIpRange({ rangeStart: "", rangeEnd: "" });
				},
			},
		);
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
			nwid: query.id as string,
			central,
		});
	};
	const rangeChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
		setIpRange({ ...ipRange, [e.target.name]: e.target.value });
	};
	const { network } = networkByIdQuery || {};
	return (
		<div className="form-control">
			<label className="label cursor-pointer">
				<span className="label-text">{t("networkIpAssignments.ipv6.rfc4193Label")}</span>
				<input
					type="checkbox"
					name="rfc4193"
					// biome-ignore lint/complexity/useLiteralKeys: <explanation>
					checked={network?.v6AssignMode?.["rfc4193"]}
					className="checkbox checkbox-primary checkbox-sm"
					onChange={(e) => {
						setIpv6({
							nwid: query.id as string,
							central,
							organizationId,
							v6AssignMode: {
								rfc4193: e.target.checked,
							},
						});
					}}
				/>
			</label>
			<label className="label cursor-pointer">
				<span className="label-text">{t("networkIpAssignments.ipv6.plane6Label")}</span>
				<input
					type="checkbox"
					name="6plane"
					checked={network?.v6AssignMode?.["6plane"]}
					className="checkbox checkbox-primary checkbox-sm"
					onChange={(e) => {
						setIpv6({
							nwid: query.id as string,
							central,
							organizationId,
							v6AssignMode: {
								"6plane": e.target.checked,
							},
						});
					}}
				/>
			</label>
			<label className="label cursor-pointer">
				<span className="label-text">Auto-Assign from Range</span>
				<input
					type="checkbox"
					name="6plane"
					checked={network?.v6AssignMode?.zt}
					className="checkbox checkbox-primary checkbox-sm"
					onChange={(e) => {
						setIpv6({
							nwid: query.id as string,
							central,
							organizationId,
							v6AssignMode: {
								zt: e.target.checked,
							},
						});
					}}
				/>
			</label>
			{network?.ipAssignmentPools?.map((pool, index) => {
				// we dont want to show the ipv4 addresses here
				if (Address4.isValid(pool.ipRangeStart) && Address4.isValid(pool.ipRangeEnd))
					return;
				return (
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
						key={index}
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
			{network?.v6AssignMode?.zt ? (
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
							className="input input-bordered input-sm w-full"
							placeholder="2001:abcd:ef00:ffff:ffff:ffff:ffff:0000"
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
								placeholder="2001:abcd:ef00:ffff:ffff:ffff:ffff:0000"
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
			) : null}
		</div>
	);
};
