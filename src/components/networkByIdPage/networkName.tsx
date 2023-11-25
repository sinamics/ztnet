import { useEffect, useState } from "react";
import EditIcon from "~/icons/edit";
import Input from "~/components/elements/input";
import toast from "react-hot-toast";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import { type RouterInputs, type RouterOutputs, api } from "~/utils/api";
import {
	type QueryClient,
	type InfiniteData,
	useQueryClient,
} from "@tanstack/react-query";
import { type NetworkEntity } from "~/types/local/network";

interface IProp {
	central?: boolean;
	organizationId?: string;
}

const updateCache = ({
	client,
	data,
	input,
}: {
	client: QueryClient;
	input: RouterInputs["network"]["getNetworkById"];
	data: Partial<NetworkEntity>;
}) => {
	client.setQueryData(
		[
			["network", "getNetworkById"],
			{
				input,
				type: "query",
			},
		],
		(oldData) => {
			const newData = oldData as InfiniteData<RouterOutputs["network"]["getNetworkById"]>;
			return {
				...newData,
				network: { ...data },
			};
		},
	);
};

const NetworkName = ({ central = false, organizationId }: IProp) => {
	const t = useTranslations("networkById");
	const client = useQueryClient();
	const [state, setState] = useState({
		editNetworkName: false,
		networkName: "",
	});

	const { query } = useRouter();
	const {
		data: networkById,
		isLoading: loadingNetwork,
		error: errorNetwork,
		refetch: refetchNetworkById,
	} = api.network.getNetworkById.useQuery({
		nwid: query.id as string,
		central,
	});

	useEffect(() => {
		setState((prev) => ({
			...prev,
			networkName: networkById?.network?.name,
		}));
	}, [networkById?.network?.name]);

	const { mutate: updateNetworkName } = api.network.networkName.useMutation({
		onSuccess: (data) => {
			const input = {
				nwid: query.id as string,
				central,
			};
			// void refecthNetworkById();
			updateCache({ client, data, input });
		},
		onError: (e) => {
			void toast.error(e?.message);
		},
	});
	const changeNameHandler = (e: React.ChangeEvent<HTMLFormElement>) => {
		e.preventDefault();
		updateNetworkName(
			{
				nwid: networkById?.network?.id,
				central,
				updateParams: { name: state?.networkName, organizationId },
			},
			{
				onSuccess: () => {
					void refetchNetworkById();
					setState({ ...state, editNetworkName: false });
				},
			},
		);
	};
	const eventHandler = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		setState({ ...state, [e.target.name]: e.target.value });
	};

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
	if (errorNetwork) {
		return (
			<div className="flex flex-col items-center justify-center">
				<h1 className="text-center text-2xl font-semibold">{errorNetwork.message}</h1>
				<ul className="list-disc">
					<li>{t("errorSteps.step1")}</li>
					<li>{t("errorSteps.step2")}</li>
				</ul>
			</div>
		);
	}

	const { network } = networkById || {};
	return (
		<div className="flex flex-col justify-between sm:flex-row">
			<span className="font-medium">{t("networkName")}</span>
			<span className="flex items-center gap-2">
				{state.editNetworkName ? (
					<form onSubmit={changeNameHandler}>
						<Input
							focus
							useTooltip
							name="networkName"
							onChange={eventHandler}
							defaultValue={network?.name}
							type="text"
							placeholder={network?.name}
							className="input-bordered input-primary input-xs"
						/>
					</form>
				) : (
					network?.name
				)}
				<EditIcon
					data-testid="changeNetworkName"
					className="hover:text-opacity-50"
					onClick={() =>
						setState({
							...state,
							editNetworkName: !state.editNetworkName,
						})
					}
				/>
			</span>
		</div>
	);
};

export default NetworkName;
