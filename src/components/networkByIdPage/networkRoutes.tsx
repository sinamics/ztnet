import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import { api } from "~/utils/api";
import { type RoutesEntity } from "~/types/local/network";
import { type ChangeEvent, useState } from "react";
import { type ErrorData } from "~/types/errorHandling";
import { useTranslations } from "next-intl";

const initialRouteInput = {
	target: "",
	via: "",
};

interface IProp {
	central?: boolean;
	organizationId?: string;
}

export const NettworkRoutes = ({ central = false, organizationId }: IProp) => {
	const b = useTranslations("commonButtons");
	const t = useTranslations("networkById");
	const [showRouteInput, setShowRouteInput] = useState<boolean>(false);
	const [routeInput, setRouteInput] = useState<RoutesEntity>(initialRouteInput);

	const { query } = useRouter();
	const {
		data: networkById,
		isLoading,
		refetch: refecthNetworkById,
	} = api.network.getNetworkById.useQuery(
		{
			nwid: query.id as string,
			central,
		},
		{ enabled: !!query.id },
	);

	const { mutate: updateManageRoutes, isLoading: isUpdating } =
		api.network.managedRoutes.useMutation({
			onError: (e) => {
				if ((e?.data as ErrorData)?.zodError?.fieldErrors) {
					void toast.error((e?.data as ErrorData)?.zodError?.fieldErrors?.updateParams);
				} else {
					void toast.error(e?.message);
				}
			},
		});

	const deleteRoute = (route: RoutesEntity) => {
		const _routes = [...network.routes];
		const newRouteArr = _routes.filter((r) => r.target !== route.target);

		updateManageRoutes(
			{
				updateParams: { routes: [...newRouteArr] },
				organizationId,
				nwid: query.id as string,
				central,
			},
			{ onSuccess: () => void refecthNetworkById() },
		);
	};
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
					routes: [...network.routes, { ...routeInput }],
				},
				organizationId,
				nwid: query.id as string,
				central,
			},
			{
				onSuccess: () => {
					void refecthNetworkById();
					setShowRouteInput(false);
					setRouteInput(initialRouteInput);
				},
			},
		);
	};
	const { network } = networkById || {};
	if (isLoading) return <div>Loading</div>;

	return (
		<div className="collapse-arrow collapse w-full border border-base-300 bg-base-200">
			<input type="checkbox" />
			<div className="collapse-title">{t("nettworkRoutes.managedRoutesTitle")}</div>
			<div className="collapse-content" style={{ width: "100%" }}>
				{network?.routes.length === 0 ? (
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
					{network?.routes.map((route) => {
						return (
							<div
								key={route.target}
								className="flex items-center justify-between space-y-1 hover:bg-base-100 hover:rounded-md"
							>
								<div key={route.target} className="text-xs opacity-30 md:text-base">
									{route.target} via {route.via ? route.via : "LAN"}
								</div>
								<div>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										strokeWidth="1.5"
										stroke="currentColor"
										className="h-5 w-5 cursor-pointer hover:text-primary "
										onClick={() => !isUpdating && deleteRoute(route)}
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
										/>
									</svg>
								</div>
							</div>
						);
					})}
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
