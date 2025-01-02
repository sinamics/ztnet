import { useState } from "react";
import EditIcon from "~/icons/edit";
import Input from "~/components/elements/input";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import { useMutation } from "@tanstack/react-query";
import { useTrpcApiErrorHandler } from "~/hooks/useTrpcApiHandler";
import { server_updateNetworkName } from "~/features/network/server/actions/updateNetworkName";
import { useNetworkStore } from "~/store/networkStore";

interface IProp {
	central?: boolean;
	organizationId?: string;
}

const NetworkName = ({ central = false, organizationId }: IProp) => {
	const t = useTranslations("networkById");

	const network = useNetworkStore((state) => state.network);
	const updateNetworkName = useNetworkStore((state) => state.updateNetworkName);

	const handleApiError = useTrpcApiErrorHandler();

	const [state, setState] = useState({
		editNetworkName: false,
		networkName: "",
	});

	const { mutate: updateNetworkNameMutation, isPending } = useMutation({
		mutationFn: server_updateNetworkName,
		onSuccess: (data) => {
			if (data) updateNetworkName(data?.name);
		},
		onError: handleApiError,
	});

	const changeNameHandler = (e: React.ChangeEvent<HTMLFormElement>) => {
		e.preventDefault();
		updateNetworkNameMutation(
			{
				nwid: network?.id as string,
				central,
				organizationId,
				updateParams: { name: state?.networkName },
			},
			{
				onSuccess: () => {
					// void refetchNetworkById();
					setState({ ...state, editNetworkName: false });
					toast.success("Network Name updated successfully");
				},
			},
		);
	};
	const eventHandler = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		setState({ ...state, [e.target.name]: e.target.value });
	};

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
							disabled={isPending}
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
