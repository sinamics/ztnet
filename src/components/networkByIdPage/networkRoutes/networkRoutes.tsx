import { useRouter } from "next/router";
import { api } from "~/utils/api";
import { type RoutesEntity } from "~/types/local/network";
import { type ChangeEvent, useState } from "react";
import { useTranslations } from "next-intl";
import {
	useTrpcApiErrorHandler,
	useTrpcApiSuccessHandler,
} from "~/hooks/useTrpcApiHandler";
import { NetworkRoutesTable } from "./networkRoutesTable";

const initialRouteInput = {
	target: "",
	via: "",
};

interface IProp {
	central?: boolean;
	organizationId?: string;
}

export const NetworkRoutes = ({ central = false, organizationId }: IProp) => {
	const b = useTranslations("commonButtons");
	const t = useTranslations("networkById");

	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();

	const [showRouteInput, setShowRouteInput] = useState<boolean>(false);
	const [routeInput, setRouteInput] = useState<RoutesEntity>(initialRouteInput);

	const { query } = useRouter();
	const {
		data: networkById,
		isLoading,
		refetch: refecthNetworkById,
	} = api.network.getNetworkById.useQuery({
		nwid: query.id as string,
		central,
	});

	const { network } = networkById || {};

	const { mutate: updateManageRoutes } = api.network.managedRoutes.useMutation({
		onError: handleApiError,
		onSuccess: handleApiSuccess({ actions: [refecthNetworkById] }),
	});

	const routeHandler = (event: ChangeEvent<HTMLInputElement>) => {
		setRouteInput({
			...routeInput,
			[event.target.name]: event.target.value,
		});
	};

	const submitHandler = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		updateManageRoutes(
			{
				updateParams: {
					routes: [...(network.routes as RoutesEntity[]), { ...routeInput }],
				},
				organizationId,
				nwid: query.id as string,
				central,
			},
			{
				onSuccess: () => {
					setShowRouteInput(false);
					setRouteInput(initialRouteInput);
				},
			},
		);
	};

	if (isLoading) return <div>Loading</div>;

	return (
		<div className="collapse-arrow collapse w-full border border-base-300 bg-base-200">
			<input type="checkbox" />
			<div className="collapse-title">{t("nettworkRoutes.managedRoutesTitle")}</div>
			<div className="collapse-content" style={{ width: "100%" }}>
				{(network?.routes as RoutesEntity[]).length === 0 ? (
					<div className="alert alert-warning p-2">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-6 w-6 shrink-0 stroke-current"
							fill="none"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
							/>
						</svg>
						<div>
							<h3 className="font-bold">{t("nettworkRoutes.noManagedRoutesTitle")}</h3>
							<div className="text-xs">
								<p>{t("nettworkRoutes.noManagedRoutesDescription1")}</p>
								<p>{t("nettworkRoutes.noManagedRoutesDescription2")}</p>
							</div>
						</div>
					</div>
				) : null}
				<div className="grid grid-cols-1 pt-3">
					<NetworkRoutesTable />
				</div>
				{showRouteInput ? (
					<form className="relative my-5 flex" onSubmit={submitHandler}>
						<input
							type="text"
							name="target"
							onChange={routeHandler}
							placeholder={t("nettworkRoutes.destinationPlaceholder")}
							className="input input-xs w-3/6 input-bordered"
						/>
						<div className="px-4">via</div>
						<input
							type="text"
							name="via"
							onChange={routeHandler}
							placeholder={t("nettworkRoutes.viaPlaceholder")}
							className="input input-xs w-3/6 input-bordered"
						/>
						<button type="submit" className="btn btn-active btn-xs ml-4 rounded-md">
							{b("add")}
						</button>
						<button
							onClick={() => setShowRouteInput(!showRouteInput)}
							className="btn btn-ghost btn-xs ml-4"
						>
							{b("cancel")}
						</button>
					</form>
				) : null}
				<div>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						strokeWidth="1.5"
						stroke="currentColor"
						className="mt-2 h-6 w-6 cursor-pointer  rounded-md border text-primary"
						onClick={() => setShowRouteInput(!showRouteInput)}
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M12 4.5v15m7.5-7.5h-15"
						/>
					</svg>
				</div>
			</div>
		</div>
	);
};
