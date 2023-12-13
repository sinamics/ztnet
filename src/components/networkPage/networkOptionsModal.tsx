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
	const t = useTranslations("admin");
	const [action, setAction] = useState({ deleteNetwork: false, moveNetwork: false });
	const [input, setInput] = useState({ name: "", organizationId: "" });
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
						<header className="text-md">Move network to Organization</header>
						<p className="text-sm text-gray-500">
							You can locate the ID in the organization URL
						</p>

						{action.moveNetwork ? (
							<form>
								<p className="text-sm text-red-600">
									<strong>Warning:</strong> Transferring the network will move both the
									network and its members to the selected organization. This action is
									irreversible and cannot be undone. Please confirm the organization ID
									carefully before proceeding.
									<br /> Additionally, ensure you have write permissions to the
									organization to which you are transferring the network.
								</p>

								<input
									type="text"
									name="organizationId"
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
										className="btn-sm btn-warning btn w-2/6"
									>
										Move Network
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
										{t("users.users.userOptionModal.buttons.cancle")}
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
								Move To Organization
							</button>
						)}
					</div>

					<div className="col-span-4 ">
						<header className="text-md">Delete Network</header>
						<p className="text-sm text-gray-500">
							Deleting a network will permanently remove it along with all its associated
							data.
						</p>
						{action.deleteNetwork ? (
							<form>
								<p className="text-sm text-red-600">
									<strong>Warning:</strong> This action will irreversibly delete the
									network and all related members, settings, and data. This process cannot
									be undone. Please ensure you have backed up any necessary information
									before proceeding with deletion.
								</p>
								<input
									type="text"
									name="name"
									onChange={inputHandler}
									placeholder="Type the network ID"
									className="input input-bordered border-warning input-sm w-full max-w-xs my-2"
								/>

								<div className="flex gap-5">
									<button
										onClick={(e) => {
											e.preventDefault();
											deleteNetwork({ nwid: networkId });
										}}
										type="submit"
										className="btn-sm btn-error btn w-2/6"
									>
										Delete Network
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
										{t("users.users.userOptionModal.buttons.cancle")}
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
								Delete Network
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default NetworkOptionsModal;
