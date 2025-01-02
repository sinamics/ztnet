"use client";

import { useParams } from "next/navigation";
import { useNetwork } from "../providers/NetworkProvider";
import { useModalStore } from "~/utils/store";
import { deleteNetwork } from "../server/actions/deleteNetwork";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useNetworkStore } from "~/store/networkStore";

export default function NetworkActions() {
	const network = useNetworkStore((state) => state.network);
	const urlParams = useParams();

	const { mutate: server_deleteNetwork } = useMutation({
		mutationFn: deleteNetwork,
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const callModal = useModalStore((state) => state.callModal);

	return (
		<>
			<div className="divider mx-auto flex px-4 py-4 text-sm sm:px-10 md:text-base">
				Network Actions
			</div>
			<div className="mx-auto px-4 py-4 text-sm sm:px-10 md:flex-row md:text-base">
				<div className="flex items-end md:justify-end">
					<button
						onClick={() =>
							callModal({
								title: `Delete Network: ${network.name}`,
								description:
									"Are you sure you want to delete this network? This cannot be undone.",
								yesAction: () =>
									server_deleteNetwork({
										nwid: urlParams.id as string,
										central: false,
									}),
							})
						}
						className="btn btn-error btn-outline btn-wide"
					>
						Delete Network
					</button>
				</div>
			</div>
		</>
	);
}
