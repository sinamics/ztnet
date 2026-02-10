import React, { useState } from "react";
import cn from "classnames";
import { useModalStore } from "~/utils/store";
import { useTranslations } from "next-intl";
import { api } from "~/utils/api";
import {
	useTrpcApiErrorHandler,
	useTrpcApiSuccessHandler,
} from "~/hooks/useTrpcApiHandler";
import { TransferNetworkToOrganization } from "./transferNetworkToOrganization";

interface Iprops {
	networkId: string;
}

const NetworkOptionsModal = ({ networkId }: Iprops) => {
	const b = useTranslations("commonButtons");
	const t = useTranslations("networks");

	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();

	const [action, setAction] = useState({ deleteNetwork: false, moveNetwork: false });
	const closeModal = useModalStore((state) => state.closeModal);

	const { refetch: refetchNetwork } = api.network.getUserNetworks.useQuery({
		central: false,
	});

	const { mutate: deleteNetwork, isLoading: loadingDeleteNetwork } =
		api.network.deleteNetwork.useMutation({
			onError: handleApiError,
			onSuccess: handleApiSuccess({ actions: [refetchNetwork, closeModal] }),
		});

	if (loadingDeleteNetwork) {
		return (
			<div className="fixed inset-0 z-50 flex items-center justify-center">
				<span className="loading loading-bars loading-lg"></span>
			</div>
		);
	}
	return (
		<div className="space-y-10">
			<TransferNetworkToOrganization networkId={networkId} />
			<div className={cn("space-y-5", { "opacity-30": false })}>
				<div>
					<header className="text-md">
						{t("networkActionModal.deleteNetwork.title")}
					</header>
					<p className="text-sm text-gray-500">
						{t("networkActionModal.deleteNetwork.description")}
					</p>
				</div>
				{action.deleteNetwork ? (
					<form className="space-y-5">
						<p className="text-sm text-red-600">
							{t.rich("networkActionModal.deleteNetwork.warningText", {
								strong: (children) => <strong>{children}</strong>,
								br: () => <br />,
							})}
						</p>
						<div className="flex gap-5">
							<button
								onClick={(e) => {
									e.preventDefault();
									deleteNetwork({ nwid: networkId });
								}}
								type="submit"
								className="btn-sm btn-error btn w-2/6"
							>
								{b("imSure")}
							</button>
							<button
								onClick={() =>
									setAction((prev) => ({
										...prev,
										deleteNetwork: !prev.deleteNetwork,
									}))
								}
								type="submit"
								className="btn-sm btn w-2/6"
							>
								{b("cancel")}
							</button>
						</div>
					</form>
				) : (
					<button
						onClick={() =>
							setAction((prev) => ({ ...prev, deleteNetwork: !prev.deleteNetwork }))
						}
						type="submit"
						className="btn-sm btn btn-primary"
					>
						{b("deleteNetwork")}
					</button>
				)}
			</div>
		</div>
	);
};

export default NetworkOptionsModal;
