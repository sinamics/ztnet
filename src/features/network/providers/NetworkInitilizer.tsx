"use client";

import { useRef } from "react";
import { useNetworkStore } from "~/store/networkStore";

export function NetworkStoreInitializer({
	networkData,
}: {
	networkData: any;
}) {
	const initialized = useRef(false);

	if (!initialized.current) {
		useNetworkStore.getState().setNetwork(networkData?.network);
		initialized.current = true;
	}

	return null;
}
