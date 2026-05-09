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

type Props = {
	networkId: string;
	sourceOrganizationId: string;
	onSuccess?: () => void;
};

export const TransferNetworkBetweenOrganizations = ({
	networkId,
	sourceOrganizationId,
	onSuccess,
}: Props) => {
	const t = useTranslations();
	const { data: organizations } = api.org.getOrgIdbyUserid.useQuery();

	const [action, setAction] = useState<{
		moveNetwork: boolean;
		targetOrganizationId: string | null;
	}>({
		moveNetwork: false,
		targetOrganizationId: null,
	});

	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();

	const closeModal = useModalStore((state) => state.closeModal);

	const { mutate: transferNetwork } =
		api.org.transferNetworkBetweenOrganizations.useMutation({
			onError: handleApiError,
			onSuccess: handleApiSuccess({
				actions: [closeModal, ...(onSuccess ? [onSuccess] : [])],
			}),
		});

	const renderOrg = (org: { orgName: string; id: string }) => (
		<span>
			{org.orgName} - {org.id}
		</span>
	);

	const selectableOrgs = (organizations ?? []).filter(
		(org) => org.id !== sourceOrganizationId,
	);

	return (
		<div className={cn("space-y-5")}>
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
					items={selectableOrgs}
					displayField="orgName"
					inputClassName="w-full"
					idField="id"
					placeholder="Select Organization"
					renderItem={renderOrg}
					onOptionSelect={(org) => {
						setAction((prev) => ({
							...prev,
							targetOrganizationId: org.id,
						}));
					}}
				/>
			</div>
			{action.moveNetwork ? (
				<form className="space-y-5">
					<p className="text-sm text-red-600">
						{t.rich("networks.networkActionModal.moveNetwork.warningTextOrgToOrg", {
							strong: (children) => <strong>{children}</strong>,
							br: () => <br />,
						})}
					</p>

					<div className="flex gap-5">
						<button
							onClick={(e) => {
								e.preventDefault();
								if (!action.targetOrganizationId) return;
								transferNetwork({
									nwid: networkId,
									sourceOrganizationId,
									targetOrganizationId: action.targetOrganizationId,
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
					disabled={!action.targetOrganizationId}
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
