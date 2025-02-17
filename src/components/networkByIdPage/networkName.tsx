"use client";
import { useState } from "react";
import EditIcon from "~/icons/edit";
import Input from "~/components/elements/input";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import { useMutation } from "@tanstack/react-query";
import { useTrpcApiErrorHandler } from "~/hooks/useTrpcApiHandler";
import { server_updateNetworkName } from "~/features/network/server/actions/updateNetworkName";
import { useNetworkField, NetworkSection } from "~/store/networkStore";

interface NetworkNameProps {
	central?: boolean;
	organizationId?: string;
}

export default function NetworkName({
	central = false,
	organizationId,
}: NetworkNameProps) {
	const t = useTranslations("networkById");
	const handleApiError = useTrpcApiErrorHandler();

	// Use specific field selectors instead of the whole basicInfo object
	const { name: networkName, id: networkId } = useNetworkField(
		NetworkSection.BASIC_INFO,
		["name", "id"] as const,
	);

	const [isEditing, setIsEditing] = useState(false);

	const { mutate: updateNetworkNameMutation, isPending } = useMutation({
		mutationFn: server_updateNetworkName,
		// onSuccess: (response) => {
		// 	if (response) {
		// 		updateSection(NetworkSection.BASIC_INFO, { name: response.name });
		// 	}
		// },
		onError: handleApiError,
	});

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const newName = formData.get("networkName") as string;

		updateNetworkNameMutation(
			{
				nwid: networkId as string,
				central,
				organizationId,
				updateParams: { name: newName },
			},
			{
				onSuccess: () => {
					setIsEditing(false);
					toast.success("Network Name updated successfully");
				},
			},
		);
	};

	return (
		<div className="flex flex-col justify-between sm:flex-row">
			<span className="font-medium">{t("networkName")}</span>
			<span className="flex items-center gap-2">
				{isEditing ? (
					<form onSubmit={handleSubmit}>
						<Input
							focus
							useTooltip
							name="networkName"
							defaultValue={networkName}
							type="text"
							placeholder={networkName}
							className="input-bordered input-primary input-xs"
							disabled={isPending}
						/>
					</form>
				) : (
					networkName
				)}
				<EditIcon
					data-testid="changeNetworkName"
					className="hover:text-opacity-50"
					onClick={() => setIsEditing(!isEditing)}
				/>
			</span>
		</div>
	);
}
