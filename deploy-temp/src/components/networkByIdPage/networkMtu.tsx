import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { api } from "~/utils/api";
import { useTranslations } from "next-intl";
import {
	useTrpcApiErrorHandler,
	useTrpcApiSuccessHandler,
} from "~/hooks/useTrpcApiHandler";

interface IProp {
	central?: boolean;
	organizationId?: string;
}

export const NetworkMTU = ({ central = false, organizationId }: IProp) => {
	const t = useTranslations("networkById");
	const [state, setState] = useState({
		mtu: "",
	});

	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();
	const utils = api.useUtils();

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
		onError: handleApiError,
		onSuccess: async () => {
			await utils.network.getNetworkById.invalidate({
				nwid: query.id as string,
				central,
			});
			handleApiSuccess({ actions: [refetchNetwork] })();
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

		updateNetwork({
			nwid: network.nwid,
			central,
			organizationId,
			updateParams: {
				mtu: parseInt(state.mtu),
			},
		});
	};

	const { network } = networkByIdQuery || {};
	return (
		<form className="flex justify-between">
			<div className="form-control">
				<label className="label-text">{t("networkIpAssignments.mtu.title")}</label>
				<label className="text-gray-500 text-sm mb-2">
					{t("networkIpAssignments.mtu.description")}
				</label>
				<label className="text-gray-500 label-text">
					{t("networkIpAssignments.mtu.acceptedValue")}
				</label>
				<div className="join w-3/6">
					<input
						id="mtu"
						name="mtu"
						value={state.mtu}
						onChange={onChangeHandler}
						className="input join-item input-sm input-bordered w-full"
						placeholder="Default 2800"
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
		</form>
	);
};
