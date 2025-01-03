"use client";

import NetworkDescription from "~/components/networkByIdPage/networkDescription";
import NetworkName from "~/components/networkByIdPage/networkName";
import { NetworkPrivatePublic } from "~/components/networkByIdPage/networkPrivatePublic";
import NetworkQrCode from "~/components/networkByIdPage/networkQrCode";
import { useNetwork } from "../providers/NetworkProvider";
import { CopyNetworkId } from "./CopyNetworkId";
import { useNetworkStore } from "~/store/networkStore";

export default function NetworkHeader() {
	const network = useNetworkStore((state) => state.basicInfo);

	return (
		<div className="mx-auto py-10 px-4 text-sm sm:px-10 md:text-base">
			<div className="grid grid-cols-1 xl:grid-cols-[1fr,auto,1fr] gap-10">
				<div className="flex flex-col space-y-3 sm:space-y-0">
					<div className="flex flex-col justify-between sm:flex-row">
						<span className="font-semibold">Network ID</span>
						<CopyNetworkId networkId={network.nwid} />
					</div>
					<NetworkName />
					<NetworkDescription />
				</div>
				<div className="cursor-pointer">
					<NetworkQrCode networkId={network.nwid} />
				</div>
				<div>
					<NetworkPrivatePublic />
				</div>
			</div>
		</div>
	);
}
