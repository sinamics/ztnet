import { useState, useEffect } from "react";
import React from "react";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import { type RouterInputs, type RouterOutputs, api } from "~/utils/api";
import {
	type QueryClient,
	useQueryClient,
	type Query,
} from "@tanstack/react-query";
import { type CentralNetwork } from "~/types/central/network";
import { type NetworkEntity } from "~/types/local/network";

interface IProp {
	central?: boolean;
}
const updateCache = ({
	client,
	data,
	input,
}: {
	client: QueryClient;
	input: RouterInputs["network"]["getNetworkById"];
	data: NetworkEntity | Partial<CentralNetwork>;
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
			const newData = oldData as Query<
				RouterOutputs["network"]["getNetworkById"]
			>;
			if ("network" in newData && newData.network && typeof data === "object") {
				return {
					...newData,
					network: { ...(newData.network as object), ...(data as object) },
				};
			}
			return newData;
		},
	);
};
const NetworkDescription = ({ central = false }: IProp) => {
	const t = useTranslations("networkById");
	const client = useQueryClient();
	const { query } = useRouter();
	const [state, setState] = useState({
		toggleDescriptionInput: false,
		description: "",
	});

	const {
		data: networkById,
		isLoading: loadingNetwork,
		error: errorNetwork,
		refetch: refetchNetwork,
	} = api.network.getNetworkById.useQuery(
		{
			nwid: query.id as string,
			central,
		},
		{ staleTime: Infinity },
	);

	useEffect(() => {
		setState((prev) => ({
			...prev,
			description: networkById?.network?.description,
		}));
	}, [networkById?.network?.description]);

	const { mutate: networkDescription } =
		api.network.networkDescription.useMutation({
			onSuccess: (data) => {
				const input = {
					nwid: query.id as string,
					central,
				};
				// void refecthNetworkById();
				updateCache({ client, data, input });
			},
		});

	const toggleDescriptionInput = () => {
		setState({
			...state,
			toggleDescriptionInput: !state.toggleDescriptionInput,
		});
	};
	const eventHandler = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		setState({ ...state, [e.target.name]: e.target.value });
	};
	if (errorNetwork) {
		return (
			<div className="flex flex-col items-center justify-center">
				<h1 className="text-center text-2xl font-semibold">
					{errorNetwork.message}
				</h1>
				<ul className="list-disc">
					<li>{t("errorSteps.step1")}</li>
					<li>{t("errorSteps.step2")}</li>
				</ul>
			</div>
		);
	}

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

	const { network } = networkById || {};
	return (
		<div className="py-3 font-light">
			{!state.toggleDescriptionInput ? (
				network?.description ? (
					<div
						onClick={toggleDescriptionInput}
						className="cursor-pointer border-l-4 border-primary p-2 leading-snug"
						style={{ caretColor: "transparent" }}
					>
						{network?.description}
					</div>
				) : (
					<div
						onClick={toggleDescriptionInput}
						className="cursor-pointer border-l-4 border-primary p-2 leading-snug"
						style={{ caretColor: "transparent" }}
					>
						{t("addDescription")}
					</div>
				)
			) : (
				<form>
					<textarea
						rows={3}
						value={state?.description}
						name="description"
						onChange={eventHandler}
						maxLength={255}
						style={{ maxHeight: "100px" }}
						className="custom-scrollbar textarea textarea-primary w-full leading-snug "
						placeholder={t("descriptionPlaceholder")}
						onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault();
								// submit form when Enter key is pressed and Shift key is not held down.
								const target = e.target as HTMLTextAreaElement;
								networkDescription(
									{
										nwid: network.id,
										central,
										updateParams: { description: target.value },
									},
									{
										onSuccess: () => {
											void refetchNetwork();
											setState({
												...state,
												toggleDescriptionInput: !state.toggleDescriptionInput,
											});
										},
									},
								);
							}
						}}
					></textarea>
				</form>
			)}
		</div>
	);
};

export default NetworkDescription;
