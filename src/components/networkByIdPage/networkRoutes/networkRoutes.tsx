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
import Input from "~/components/elements/input";

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
			<div className="collapse-title">{t("networkRoutes.managedRoutesTitle")}</div>
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
							<h3 className="font-bold">{t("networkRoutes.noManagedRoutesTitle")}</h3>
							<div className="text-xs">
								<p>{t("networkRoutes.noManagedRoutesDescription1")}</p>
								<p>{t("networkRoutes.noManagedRoutesDescription2")}</p>
							</div>
						</div>
					</div>
				) : null}
				<div className="grid grid-cols-1 pt-3">
					<NetworkRoutesTable />
				</div>
				{showRouteInput ? (
					<form className="relative my-5 space-y-4 max-w-2xl" onSubmit={submitHandler}>
						<div className="flex flex-col sm:flex-row sm:items-start gap-4">
							<div className="flex-1">
								<label htmlFor="target-input" className="block text-sm font-medium mb-1">
									{t("networkRoutes.destinationPlaceholder")}
								</label>
								<Input
									id="target-input"
									type="text"
									name="target"
									onChange={routeHandler}
									placeholder="10.11.12.0/24"
									className="w-full border rounded-md shadow-sm text-sm input-sm"
								/>
								<p className="mt-1 text-xs text-gray-500">
									{t("networkRoutes.destinationInputDescription")}
								</p>
							</div>

							<div className="flex-1">
								<label htmlFor="via-input" className="block text-sm font-medium mb-1">
									{t("networkRoutes.viaPlaceholder")}
								</label>
								<Input
									id="via-input"
									type="text"
									name="via"
									onChange={routeHandler}
									placeholder="192.168.168.1"
									className="w-full border rounded-md shadow-sm text-sm input-sm"
								/>
								<p className="mt-1 text-xs text-gray-500">
									{t("networkRoutes.viaInputDescription")}
								</p>
							</div>

							<div className="flex gap-2 sm:ml-4 sm:mt-6">
								<button type="submit" className="btn btn-primary btn-xs">
									{b("add")}
								</button>
								<button
									type="button"
									onClick={() => setShowRouteInput(!showRouteInput)}
									className="btn btn-xs"
								>
									{b("cancel")}
								</button>
							</div>
						</div>
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
