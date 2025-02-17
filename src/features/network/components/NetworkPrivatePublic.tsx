"use client";

import { toast } from "react-hot-toast";
import { useTranslations } from "next-intl";
import { useMutation } from "@tanstack/react-query";
import { useTrpcApiErrorHandler } from "~/hooks/useTrpcApiHandler";
import { useNetworkField, NetworkSection } from "~/store/networkStore";
import { updateNetworkPrivacy } from "../server/actions/updateNetworkPrivacy";
import CardComponent from "../../../components/networkByIdPage/privatePublic";

interface IProp {
	central?: boolean;
	organizationId?: string;
}

export const NetworkPrivatePublic = ({ central = false, organizationId }: IProp) => {
	const t = useTranslations();

	const handleApiError = useTrpcApiErrorHandler();

	const { private: isPrivate, id: networkId } = useNetworkField(
		NetworkSection.BASIC_INFO,
		["private", "id"] as const,
	);

	const { mutate: server_setPrivatePublic } = useMutation({
		mutationFn: updateNetworkPrivacy,
		onError: handleApiError,
	});

	const privateHandler = (privateNetwork: boolean) => {
		server_setPrivatePublic(
			{
				updateParams: { private: privateNetwork },
				organizationId,
				nwid: networkId,
				central,
			},
			{
				onSuccess: () => {
					const secure = privateNetwork ? "private" : "public, please use with caution!";
					toast.success(
						t("networkById.privatePublicSwitch.accessControllMessage", {
							authType: secure,
						}),
						{ icon: "⚠️" },
					);
				},
			},
		);
	};

	return (
		<div className="flex gap-3">
			<CardComponent
				onClick={() => privateHandler(true)}
				faded={!isPrivate}
				title={t("networkById.privatePublicSwitch.privateCardTitle")}
				rootClassName="flex-1 sm:min-w-min transition ease-in-out delay-150 hover:-translate-y-1 border border-success border-2 rounded-md solid cursor-pointer bg-transparent text-inherit  "
				iconClassName="text-green-500"
				content={t("networkById.privatePublicSwitch.privateCardContent")}
			/>
			<CardComponent
				onClick={() => privateHandler(false)}
				faded={isPrivate}
				title={t("networkById.privatePublicSwitch.publicCardTitle")}
				rootClassName="flex-1 transition ease-in-out delay-150 hover:-translate-y-1 border border-red-500 border-2 rounded-md solid cursor-pointer bg-transparent text-inherit"
				iconClassName="text-warning"
				content={t("networkById.privatePublicSwitch.publicCardContent")}
			/>
		</div>
	);
};
