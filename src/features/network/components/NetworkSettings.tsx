"use client";

import { NetworkDns } from "~/components/networkByIdPage/networkDns";
import { NetworkIpAssignment } from "~/components/networkByIdPage/networkIpAssignments";
import { NetworkMulticast } from "~/components/networkByIdPage/networkMulticast";
import { NetworkRoutes } from "~/components/networkByIdPage/networkRoutes/networkRoutes";

export default function NetworkSettings() {
	return (
		<>
			<div className="divider mx-auto flex px-4 py-4 text-sm sm:px-10 md:text-base">
				Network Settings
			</div>
			<div className="mx-auto grid grid-cols-1 space-y-3 px-4 py-4 text-sm sm:px-10 md:text-base xl:flex xl:space-y-0">
				<div className="w-6/6 xl:w-3/6">
					<NetworkIpAssignment />
				</div>
				<div className="divider col-start-2 hidden lg:divider-horizontal xl:inline-flex" />
				<div className="w-6/6 xl:w-3/6">
					<NetworkRoutes central={false} />
				</div>
			</div>
			<div className="mx-auto grid grid-cols-1 space-y-3 px-4 py-4 text-sm sm:px-10 md:text-base xl:flex xl:space-y-0">
				<div className="w-6/6 xl:w-3/6">
					<NetworkDns />
				</div>
				<div className="divider col-start-2 hidden lg:divider-horizontal xl:inline-flex" />
				<div className="w-6/6 xl:w-3/6">
					<NetworkMulticast />
				</div>
			</div>
		</>
	);
}
