"use client";

import { useState } from "react";
import { AddMemberById } from "~/components/networkByIdPage/addMemberById";
import { InviteMemberByMail } from "~/components/networkByIdPage/inviteMemberbyMail";
import { DeletedNetworkMembersTable } from "~/components/networkByIdPage/table/deletedNetworkMembersTable";
import { NetworkMembersTable } from "~/components/networkByIdPage/table/networkMembersTable";
import { useNetwork } from "../providers/NetworkProvider";
import { NoMembersInfo } from "./NoMembersInfo";

export default function NetworkMembers() {
	const { network, members } = useNetwork();
	const [showZombieTable, setShowZombieTable] = useState(false);

	return (
		<>
			<div className="divider mx-auto flex px-4 py-4 text-sm sm:px-10 md:text-base">
				Network Members
			</div>
			<div className="mx-auto w-full px-4 py-4 text-sm sm:px-10 md:text-base">
				{members.length ? (
					<div className="membersTable-wrapper">
						<NetworkMembersTable nwid={network.nwid} central={false} />
					</div>
				) : (
					<NoMembersInfo network={network} />
				)}
			</div>
			{/* Member management section */}
			<div className="mx-auto grid grid-cols-1 space-y-3 px-4 py-4 text-sm sm:px-10 md:text-base xl:flex xl:space-y-0">
				<div className="flex w-full flex-wrap space-x-0 space-y-5 xl:space-x-5 xl:space-y-0">
					<InviteMemberByMail />
					<AddMemberById />
				</div>
			</div>
			{/* Zombie members section */}
			{network.zombieMembers?.length > 0 && (
				<div className="mx-auto w-full px-4 py-4 text-sm sm:px-10 md:text-base">
					<button
						onClick={() => setShowZombieTable(!showZombieTable)}
						className="btn btn-wide"
					>
						View Stashed Members ({network.zombieMembers.length})
					</button>
					{showZombieTable && (
						<div className="membersTable-wrapper text-center">
							<DeletedNetworkMembersTable nwid={network.nwid} />
						</div>
					)}
				</div>
			)}
		</>
	);
}
