import React, { useState } from "react";
import cn from "classnames";
import { useModalStore } from "~/utils/store";
import { useTranslations } from "next-intl";
import { api } from "~/utils/api";
import { ErrorData } from "~/types/errorHandling";
import toast from "react-hot-toast";

interface Iprops {
	networkId: string;
}

const NetworkOptionsModal = ({ networkId }: Iprops) => {
	const b = useTranslations("commonButtons");
	const t = useTranslations("networks");
	const [action, setAction] = useState({ deleteNetwork: false, moveNetwork: false });
	const [input, setInput] = useState({ organizationId: null });
	const { closeModal } = useModalStore((state) => state);

	const { refetch: refetchNetwork } = api.network.getUserNetworks.useQuery({
		central: false,
	});
	const { mutate: transferNetwork } = api.org.transferNetworkOwnership.useMutation({
		onError: (error) => {
			if ((error.data as ErrorData)?.zodError) {
				const fieldErrors = (error.data as ErrorData)?.zodError.fieldErrors;
				for (const field in fieldErrors) {
					toast.error(`${fieldErrors[field].join(", ")}`);
				}
			} else if (error.message) {
				toast.error(error.message);
			} else {
				toast.error("An unknown error occurred");
			}
		},
		onSuccess: () => {
			refetchNetwork();
			closeModal();
		},
	});
	const { mutate: deleteNetwork, isLoading: loadingDeleteNetwork } =
		api.network.deleteNetwork.useMutation({
			onError: (error) => {
				if ((error.data as ErrorData)?.zodError) {
					const fieldErrors = (error.data as ErrorData)?.zodError.fieldErrors;
					for (const field in fieldErrors) {
						toast.error(`${fieldErrors[field].join(", ")}`);
					}
				} else if (error.message) {
					toast.error(error.message);
				} else {
					toast.error("An unknown error occurred");
				}
			},
			onSuccess: () => {
				refetchNetwork();
				closeModal();
			},
		});

	const inputHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
		setInput({
			...input,
			[e.target.name]: e.target.value,
		});
	};

	if (loadingDeleteNetwork) {
		return (
			<div className="fixed inset-0 z-50 flex items-center justify-center">
				<span className="loading loading-bars loading-lg"></span>
			</div>
		);
	}
	return (
		<div>
			<div className={cn({ "opacity-30": false })}>
				<div className="grid grid-cols-4 items-start gap-4 space-y-10">
					<div className="col-span-4 ">
						<header className="text-md">{b("moveNetworkToOrganization")}</header>
						<p className="text-sm text-gray-500">
							{t("networkActionModal.moveNetwork.description")}
						</p>

						{action.moveNetwork ? (
							<form>
								<p className="text-sm text-red-600">
									{t.rich("networkActionModal.moveNetwork.warningText", {
										strong: (children) => <strong>{children}</strong>,
										br: () => <br />,
									})}
								</p>

								<input
									type="text"
									name="organizationId"
									value={input.organizationId || ""}
									onChange={inputHandler}
									placeholder="Type the organization ID"
									className="input input-bordered border-warning input-sm w-full max-w-xs my-2"
								/>

								<div className="flex gap-5">
									<button
										onClick={(e) => {
											e.preventDefault();
											transferNetwork({
												nwid: networkId,
												organizationId: input.organizationId,
											});
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
												moveNetwork: !prev.moveNetwork,
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
									setAction((prev) => ({ ...prev, moveNetwork: !prev.moveNetwork }))
								}
								type="submit"
								className="btn-sm btn btn-error btn-outline"
							>
								{b("moveNetwork")}
							</button>
						)}
					</div>

					<div className="col-span-4 ">
						<header className="text-md">
							{t("networkActionModal.deleteNetwork.title")}
						</header>
						<p className="text-sm text-gray-500">
							{t("networkActionModal.deleteNetwork.description")}
						</p>
						{action.deleteNetwork ? (
							<form className="space-y-5">
								<p className="text-sm text-red-600">
									{t.rich("networkActionModal.deleteNetwork.warningText", {
										strong: (children) => <strong>{children}</strong>,
										br: () => <br />,
									})}
								</p>
								{/* <input
									type="text"
									name="networkId"
									onChange={inputHandler}
									placeholder="Type the network ID"
									className="input input-bordered border-warning input-sm w-full max-w-xs my-2"
								/> */}

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
								className="btn-sm btn btn-error btn-outline"
							>
								{b("deleteNetwork")}
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default NetworkOptionsModal;
