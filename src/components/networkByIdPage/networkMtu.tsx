import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { api } from "~/utils/api";
import { toast } from "react-hot-toast";
import { type ErrorData } from "~/types/errorHandling";
import { useTranslations } from "use-intl";

interface IProp {
	central?: boolean;
	organizationId?: string;
}

export const NetworkMTU = ({ central = false, organizationId }: IProp) => {
	const t = useTranslations("networkById");
	const [state, setState] = useState({
		mtu: "",
	});

	const { query } = useRouter();
	const {
		data: networkByIdQuery,
		isLoading: loadingNetwork,
		refetch: refetchNetwork,
	} = api.network.getNetworkById.useQuery(
		{
			nwid: query.id as string,
			central,
		},
		{ enabled: !!query.id },
	);

	const { mutate: updateNetwork } = api.network.mtu.useMutation({
		onError: (e) => {
			if ((e?.data as ErrorData)?.zodError?.fieldErrors) {
				void toast.error((e?.data as ErrorData)?.zodError?.fieldErrors?.updateParams);
			} else {
				void toast.error(e?.message);
			}
		},
	});

	useEffect(() => {
		setState((prev) => ({
			...prev,
			mtu: networkByIdQuery?.network?.mtu.toString(),
		}));
	}, [networkByIdQuery?.network.mtu]);

	if (loadingNetwork) {
		// add loading progress bar to center of page, vertially and horizontally
		return (
			<div className="flex flex-col items-center justify-center">
				<h1 className="text-center text-2xl font-semibold">
					<progress className="progress progress-primary w-56"></progress>
				</h1>
			</div>
		);
	}

	const onChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
		setState({ ...state, [e.target.name]: e.target.value });
	};

	const submitHandler = (e: React.MouseEvent<HTMLButtonElement>) => {
		e.preventDefault();

		updateNetwork(
			{
				nwid: network.nwid,
				central,
				organizationId,
				updateParams: {
					mtu: parseInt(state.mtu),
				},
			},
			{
				onSuccess: () => {
					toast.success("MTU updated successfully");
					void refetchNetwork();
				},
			},
		);
	};

	const { network } = networkByIdQuery || {};
	return (
		<form className="flex justify-between">
			<div className="form-control ">
				<label className="label-text">MTU Value</label>
				<label className="text-gray-500 text-sm mb-2">
					Nodes needs to leave and re-join network to make effect.
				</label>
				<div className="join">
					<input
						id="mtu"
						name="mtu"
						value={state.mtu}
						onChange={onChangeHandler}
						className="input join-item input-sm input-bordered w-full"
						placeholder={t("networkMulticast.NumberPlaceholder")}
						type="number"
					/>
					<button
						type="submit"
						onClick={submitHandler}
						className="btn join-item btn-sm btn-active"
					>
						{t("networkMulticast.Submit")}
					</button>
				</div>
			</div>
			<button type="submit" onClick={submitHandler} className="hidden" />
		</form>
	);
};
