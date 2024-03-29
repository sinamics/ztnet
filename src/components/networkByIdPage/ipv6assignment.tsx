import { useTranslations } from "next-intl";
import { useRouter } from "next/router";
import React from "react";
import toast from "react-hot-toast";
import {
	useTrpcApiErrorHandler,
	useTrpcApiSuccessHandler,
} from "~/hooks/useTrpcApiHandler";
import { api } from "~/utils/api";

interface IProp {
	central?: boolean;
	organizationId?: string;
}

export const Ipv6assignment = ({ central = false, organizationId }: IProp) => {
	const t = useTranslations("networkById");

	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();

	const { query } = useRouter();
	const { data: networkByIdQuery, refetch: refecthNetworkById } =
		api.network.getNetworkById.useQuery(
			{
				nwid: query.id as string,
				central,
			},
			{ enabled: !!query.id },
		);

	const { mutate: setIpv6 } = api.network.ipv6.useMutation({
		onError: handleApiError,
		onSuccess: handleApiSuccess({
			actions: [refecthNetworkById],
			toastMessage: t("networkIpAssignments.ipv6.rfc4193Updated"),
		}),
	});
	const { network } = networkByIdQuery || {};
	return (
		<div className="form-control">
			<label className="label cursor-pointer">
				<span className="label-text">{t("networkIpAssignments.ipv6.rfc4193Label")}</span>
				<input
					type="checkbox"
					name="rfc4193"
					// biome-ignore lint/complexity/useLiteralKeys: <explanation>
					checked={network?.v6AssignMode?.["rfc4193"]}
					className="checkbox checkbox-primary checkbox-sm"
					onChange={(e) => {
						setIpv6({
							nwid: query.id as string,
							central,
							organizationId,
							v6AssignMode: {
								rfc4193: e.target.checked,
							},
						});
					}}
				/>
			</label>
			<label className="label cursor-pointer">
				<span className="label-text">{t("networkIpAssignments.ipv6.plane6Label")}</span>
				<input
					type="checkbox"
					name="6plane"
					checked={network?.v6AssignMode?.["6plane"]}
					className="checkbox checkbox-primary checkbox-sm"
					onChange={(e) => {
						setIpv6(
							{
								nwid: query.id as string,
								central,
								organizationId,
								v6AssignMode: {
									"6plane": e.target.checked,
								},
							},
							{
								onSuccess: () => {
									void toast.success(t("networkIpAssignments.ipv6.plane6Updated"));
								},
							},
						);
					}}
				/>
			</label>
		</div>
	);
};
