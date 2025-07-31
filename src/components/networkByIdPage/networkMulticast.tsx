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

export const NetworkMulticast = ({ central = false, organizationId }: IProp) => {
	const t = useTranslations("networkById");

	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();
	const utils = api.useUtils();

	const [state, setState] = useState({
		multicastLimit: "",
		enableBroadcast: false,
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

	const { mutate: updateNetwork } = api.network.multiCast.useMutation({
		onError: handleApiError,
		onSuccess: async () => {
			await utils.network.getNetworkById.invalidate({
				nwid: query.id as string,
				central,
			});
			handleApiSuccess({
				actions: [refetchNetwork],
				toastMessage: t("networkMulticast.MulticastUpdatedSuccessfully"),
			})();
		},
	});

	useEffect(() => {
		setState((prev) => ({
			...prev,
			multicastLimit: networkByIdQuery?.network?.multicastLimit.toString(),
			enableBroadcast: networkByIdQuery?.network?.enableBroadcast,
		}));
	}, [
		networkByIdQuery?.network.multicastLimit,
		networkByIdQuery?.network?.enableBroadcast,
	]);

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
				multicastLimit: parseInt(state.multicastLimit),
			},
		});
	};

	const { network } = networkByIdQuery || {};
	return (
		<div className="collapse-arrow collapse w-full border border-base-300 bg-base-200">
			<input type="checkbox" />
			<div className="collapse-title">{t("networkMulticast.Multicast")}</div>
			<div className="collapse-content" style={{ width: "100%" }}>
				<div>
					<form className="flex justify-between">
						<div className="form-control ">
							<label className="label" htmlFor="multicastLimit">
								<span className="label-text">
									{t("networkMulticast.MulticastRecipientLimit")}
								</span>
							</label>
							<div className="join">
								<input
									id="multicastLimit"
									name="multicastLimit"
									value={state.multicastLimit || 0}
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
						{/* <div className="form-control">
              <label>
                <span className="label-text text-xs">
                  Multicast Recipient Limit ( Hit Enter to submit )
                </span>
              </label>
              <input
                type="number"
                name="multicastLimit"
                value={state.multicastLimit}
                placeholder="Number"
                className="input input-bordered input-sm w-3/6"
                onChange={onChangeHandler}
              />
            </div> */}
						<div className="form-control">
							<label htmlFor="enableBroadcast">
								<span className="label-text text-xs">
									{t("networkMulticast.EnableBroadcast")}
								</span>
							</label>
							<input
								type="checkbox"
								id="enableBroadcast"
								name="enableBroadcast"
								checked={state.enableBroadcast || false}
								className="checkbox-primary checkbox checkbox-sm"
								onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
									updateNetwork({
										nwid: network.nwid,
										central,
										organizationId,
										updateParams: {
											enableBroadcast: e.target.checked,
										},
									})
								}
							/>
						</div>
						<button type="submit" onClick={submitHandler} className="hidden" />
					</form>
				</div>
			</div>
		</div>
	);
};
