"use client";

import { network, network_members } from "@prisma/client";
import { createContext, useContext, useState } from "react";

interface NetworkContextType {
	network: network;
	members: network_members[];
	updateNetwork: (data: network) => void;
	updateMembers: (data: network_members[]) => void;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function NetworkProvider({
	children,
	initialData,
}: {
	children: React.ReactNode;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	initialData: any;
}) {
	const [network, setNetwork] = useState(initialData.network);
	const [members, setMembers] = useState(initialData.members);

	return (
		<NetworkContext.Provider
			value={{
				network,
				members,
				updateNetwork: setNetwork,
				updateMembers: setMembers,
			}}
		>
			{children}
		</NetworkContext.Provider>
	);
}

export const useNetwork = () => {
	const context = useContext(NetworkContext);
	if (!context) {
		throw new Error("useNetwork must be used within NetworkProvider");
	}
	return context;
};
