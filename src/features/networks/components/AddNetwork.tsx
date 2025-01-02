"use client";

import { useRouter } from "next/navigation";
import { useActionErrorHandler } from "~/hooks/useActionHandler";
import { createNetwork } from "../server/actions/createNetwork";
import { useMutation } from "@tanstack/react-query";

export default function CreateNetworkButton() {
	const handleError = useActionErrorHandler();

	const router = useRouter();
	const { mutate: server_create_network, isPending } = useMutation({
		mutationFn: createNetwork,
		onSuccess: (network) => {
			if (network?.id) {
				router.push(`/network/${network.id}`);
			}
		},
		onError: handleError,
	});

	return (
		<button
			onClick={() =>
				server_create_network({
					central: false,
				})
			}
			disabled={isPending}
			className="btn btn-primary"
		>
			{isPending ? "Creating..." : "Create Network"}
		</button>
	);
}
