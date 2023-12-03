import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import { type RouterInputs, type RouterOutputs, api } from "~/utils/api";
import CardComponent from "./privatePublic";
import { useTranslations } from "next-intl";
import {
	type InfiniteData,
	type QueryClient,
	useQueryClient,
} from "@tanstack/react-query";
import { type NetworkEntity } from "~/types/local/network";
import { type CentralNetwork } from "~/types/central/network";

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
			const newData = oldData as InfiniteData<RouterOutputs["network"]["getNetworkById"]>;
			return {
				...newData,
				network: { ...data },
			};
		},
	);
};

export const NetworkPrivatePublic = ({ central = false, organizationId }: IProp) => {
	const t = useTranslations();
	const { query } = useRouter();
	const client = useQueryClient();
	const { data: networkByIdQuery, isLoading } = api.network.getNetworkById.useQuery(
		{
			nwid: query.id as string,
			central,
		},
		{ enabled: !!query.id },
	);
	const { mutate: privatePublicNetwork } = api.network.privatePublicNetwork.useMutation({
		onError: (e) => {
			void toast.error(e?.message);
		},
	});
	const privateHandler = (privateNetwork: boolean) => {
		privatePublicNetwork(
			{
				updateParams: { private: privateNetwork },
				organizationId,
				nwid: query.id as string,
				central,
			},
			{
				onSuccess: (data) => {
					const input = {
						nwid: query.id as string,
						central,
					};
					// void refecthNetworkById();
					updateCache({ client, data, input });
					const secure = privateNetwork ? "private" : "public, please use with caution!";

					toast.success(
						t("networkById.privatePublicSwitch.accessControllMessage", {
							authType: secure,
						}),
						{ icon: "⚠️" },
					);
				},
			},
		);
	};
	const { network } = networkByIdQuery || {};
	if (isLoading) return <div>Loading</div>;

	return (
		<div className="flex gap-3">
			<CardComponent
				onClick={() => privateHandler(true)}
				faded={!network.private}
				title={t("networkById.privatePublicSwitch.privateCardTitle")}
				rootClassName="sm:min-w-min transition ease-in-out delay-150 hover:-translate-y-1 border border-success border-2 rounded-md solid cursor-pointer bg-transparent text-inherit  "
				iconClassName="text-green-500"
				content={t("networkById.privatePublicSwitch.privateCardContent")}
			/>
			<CardComponent
				onClick={() => privateHandler(false)}
				faded={network.private}
				title={t("networkById.privatePublicSwitch.publicCardTitle")}
				rootClassName="transition ease-in-out delay-150 hover:-translate-y-1 border border-red-500 border-2 rounded-md solid cursor-pointer bg-transparent text-inherit"
				iconClassName="text-warning"
				content={t("networkById.privatePublicSwitch.publicCardContent")}
			/>
		</div>
	);
};
