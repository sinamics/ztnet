"use client";

import { useRouter } from "next/navigation";
import { useNetwork } from "../providers/NetworkProvider";
import { useModalStore } from "~/utils/store";
import { deleteNetwork } from "../server/deleteNetwork";

export default function NetworkActions() {
	const router = useRouter();
	const { network } = useNetwork();
	const callModal = useModalStore((state) => state.callModal);

	const handleDeleteNetwork = async () => {
		try {
			await deleteNetwork(network.nwid);
			router.push("/network");
		} catch (error) {
			console.error("Failed to delete network:", error);
		}
	};

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
								yesAction: handleDeleteNetwork,
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
