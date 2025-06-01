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
		onSuccess: handleApiSuccess({ actions: [refetchNetwork] }),
	});

	useEffect(() => {
		setState((prev) => ({
			...prev,
			mtu: networkByIdQuery?.network?.mtu?.toString() || "",
		}));
	}, [networkByIdQuery?.network?.mtu]);

	if (loadingNetwork) {
		return (
			<div className="flex flex-col items-center justify-center py-8">
				<progress className="progress progress-primary w-56"></progress>
				<p className="text-sm text-gray-500 mt-2">Loading network settings...</p>
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
		<div className="w-full space-y-4">
			{/* MTU Configuration Section */}
			<div className="space-y-3">
				{/* Title */}
				<div>
					<h3 className="text-sm font-medium text-base-content">
						{t("networkIpAssignments.mtu.title")}
					</h3>
				</div>

				{/* Description */}
				<div className="space-y-1">
					<p className="text-sm text-gray-500">
						{t("networkIpAssignments.mtu.description")}
					</p>
					<p className="text-xs text-gray-400">
						{t("networkIpAssignments.mtu.acceptedValue")}
					</p>
				</div>

				{/* MTU Input Form */}
				<div className="space-y-3">
					<div className="form-control w-full max-w-xs">
						<label className="label">
							<span className="label-text font-medium">MTU Value</span>
							<span className="label-text-alt text-gray-400">Default: 2800</span>
						</label>
						<div className="flex gap-2">
							<input
								id="mtu"
								name="mtu"
								value={state.mtu}
								onChange={onChangeHandler}
								className="input input-bordered input-sm flex-1 max-w-[200px]"
								placeholder="2800"
								type="number"
								min="68"
								max="9000"
							/>
							<button
								type="submit"
								onClick={submitHandler}
								className="btn btn-primary btn-sm px-6"
								disabled={
									!state.mtu || parseInt(state.mtu) < 68 || parseInt(state.mtu) > 9000
								}
							>
								{t("networkMulticast.Submit")}
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
