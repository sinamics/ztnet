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

export const AllowPublicStatus = ({ central = false, organizationId }: IProp) => {
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
		<div className="collapse collapse-open border border-base-300 bg-base-200">
			<input type="checkbox" />
			<div className="collapse-title">Allow Public Status</div>
			<div className="collapse-content" style={{ width: "100%" }}>
				<div className="grid grid-cols-1 pt-3"></div>
			</div>
		</div>
	);
};
