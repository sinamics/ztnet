"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useActionErrorHandler } from "~/hooks/useActionHandler";
import { createNetwork } from "../server/actions/createNetwork";

export default function CreateNetworkButton() {
	// const [error, action, isPendind] = useActionState();
	const router = useRouter();
	const [isCreating, setIsCreating] = useState(false);
	const handleError = useActionErrorHandler();

	const handleCreateNetwork = async () => {
		setIsCreating(true);
		try {
			const network = await createNetwork({ central: false });
			if (network?.id) {
				router.push(`/network/${network.id}`);
			}
		} catch (error) {
			handleError(error);
		} finally {
			setIsCreating(false);
		}
	};

	return (
		<button
			onClick={handleCreateNetwork}
			disabled={isCreating}
			className="btn btn-primary"
		>
			{isCreating ? "Creating..." : "Create Network"}
		</button>
	);
}
