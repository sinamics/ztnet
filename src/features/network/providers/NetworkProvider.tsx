"use client";

import { createContext, useContext, useState } from "react";

interface NetworkContextType {
	network: any; // Replace with your network type
	members: any[]; // Replace with your member type
	updateNetwork: (data: any) => void;
	updateMembers: (data: any[]) => void;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function NetworkProvider({
	children,
	initialData,
}: {
	children: React.ReactNode;
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
