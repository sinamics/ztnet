"use client";

import { useNetworkUpdates } from "~/hooks/useNetworkUpdates";

export function NetworkUpdatesListener({ networkId }: { networkId: string }) {
	useNetworkUpdates(networkId);
	return null;
}
