import { useTranslations } from "next-intl";
import { useRouter } from "next/router";
import React from "react";
import toast from "react-hot-toast";
import { api } from "~/utils/api";

interface IProp {
	central?: boolean;
	organizationId?: string;
}

export const Ipv6assignment = ({ central = false, organizationId }: IProp) => {
	const t = useTranslations("networkById");

	const { query } = useRouter();
	const {
		data: networkByIdQuery,
		// isLoading,
		refetch: refecthNetworkById,
	} = api.network.getNetworkById.useQuery(
		{
			nwid: query.id as string,
			central,
		},
		{ enabled: !!query.id },
	);

	const { mutate: setIpv6 } = api.network.ipv6.useMutation({
		onSuccess: () => {
			refecthNetworkById();
		},
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
						setIpv6(
							{
								nwid: query.id as string,
								central,
								organizationId,
								v6AssignMode: {
									rfc4193: e.target.checked,
								},
							},
							{
								onSuccess: () => {
									void toast.success(t("networkIpAssignments.ipv6.rfc4193Updated"));
								},
							},
						);
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
