import React, { useState } from "react";
import { api } from "~/utils/api";
import cn from "classnames";
import { useTranslations } from "next-intl";
import {
	useTrpcApiErrorHandler,
	useTrpcApiSuccessHandler,
} from "~/hooks/useTrpcApiHandler";
import { useModalStore } from "~/utils/store";
import ScrollableDropdown from "../elements/dropdownlist";

type TransferNetworkToOrganizationProps = {
	networkId: string;
};

export const TransferNetworkToOrganization = ({
	networkId,
}: TransferNetworkToOrganizationProps) => {
	const t = useTranslations();
	const { data: organizations } = api.org.getOrgIdbyUserid.useQuery();

	const [action, setAction] = useState({
		moveNetwork: false,
		organizationId: null,
	});

	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();

	const closeModal = useModalStore((state) => state.closeModal);

	const { refetch: refetchNetwork } = api.network.getUserNetworks.useQuery({
		central: false,
	});
	const { mutate: transferNetwork } = api.org.transferNetworkOwnership.useMutation({
		onError: handleApiError,
		onSuccess: handleApiSuccess({ actions: [refetchNetwork, closeModal] }),
	});

	const renderOrg = (org) => (
		<span>
			{org.orgName} - {org.id}
		</span>
	);
	return (
		<div className={cn("space-y-5", { "opacity-30": false })}>
			<div>
				<header className="text-md">
					{t("commonButtons.moveNetworkToOrganization")}
				</header>
				<p className="text-sm text-gray-500">
					{t("networks.networkActionModal.moveNetwork.description")}
				</p>
			</div>

			<div>
				<label className="label">
					<span className="label-text font-medium">List of Organizations</span>
				</label>
				<ScrollableDropdown
					items={organizations}
					displayField="orgName"
					inputClassName="w-full"
					idField="id"
					placeholder="Select Organization"
					renderItem={renderOrg}
					onOptionSelect={(org) => {
						setAction((prev) => ({
							...prev,
							organizationId: org.id,
						}));
					}}
				/>
				{/* <select
					onChange={dropdownHandler}
					className=" select select-bordered w-full select-md"
				>
					{data?.map((org) => (
						<option key={org.id} value={org.id}>
							{org.orgName} - {org.id}
						</option>
					))}
				</select> */}
			</div>
			{action.moveNetwork ? (
				<form className="space-y-5">
					<p className="text-sm text-red-600">
						{t.rich("networks.networkActionModal.moveNetwork.warningText", {
							strong: (children) => <strong>{children}</strong>,
							br: () => <br />,
						})}
					</p>

					<div className="flex gap-5">
						<button
							onClick={(e) => {
								e.preventDefault();
								transferNetwork({
									nwid: networkId,
									organizationId: action.organizationId,
								});
							}}
							type="submit"
							className="btn-sm btn-error btn w-2/6"
						>
							{t("commonButtons.imSure")}
						</button>
						<button
							onClick={() =>
								setAction((prev) => ({
									...prev,
									moveNetwork: !prev.moveNetwork,
								}))
							}
							type="submit"
							className="btn-sm btn w-2/6"
						>
							{t("commonButtons.cancel")}
						</button>
					</div>
				</form>
			) : (
				<button
					disabled={!action.organizationId}
					onClick={() =>
						setAction((prev) => ({ ...prev, moveNetwork: !prev.moveNetwork }))
					}
					type="submit"
					className="btn-sm btn btn-primary"
				>
					{t("commonButtons.moveNetwork")}
				</button>
			)}
		</div>
	);
};
