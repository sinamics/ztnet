import { useRouter } from "next/router";
import React from "react";
import toast from "react-hot-toast";
import { api } from "~/utils/api";

interface IProp {
	central?: boolean;
}

export const Ipv6assignment = ({ central = false }: IProp) => {
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
				<span className="label-text">
					ZeroTier RFC4193 (/128 for each device)
				</span>
				<input
					type="checkbox"
					name="rfc4193"
					checked={network?.v6AssignMode?.["rfc4193"]}
					className="checkbox checkbox-primary checkbox-sm"
					onChange={(e) => {
						setIpv6(
							{
								nwid: query.id as string,
								v6AssignMode: {
									rfc4193: e.target.checked,
								},
							},
							{
								onSuccess: () => {
									void toast.success("rfc4193 updated");
								},
							},
						);
					}}
				/>
			</label>
			<label className="label cursor-pointer">
				<span className="label-text">
					ZeroTier 6PLANE (/80 routable for each device)
				</span>
				<input
					type="checkbox"
					name="6plane"
					checked={network?.v6AssignMode?.["6plane"]}
					className="checkbox checkbox-primary checkbox-sm"
					onChange={(e) => {
						setIpv6(
							{
								nwid: query.id as string,
								v6AssignMode: {
									"6plane": e.target.checked,
								},
							},
							{
								onSuccess: () => {
									void toast.success("6plane updated");
								},
							},
						);
					}}
				/>
			</label>
		</div>
	);
};
