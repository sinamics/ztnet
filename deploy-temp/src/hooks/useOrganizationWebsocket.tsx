import { useEffect } from "react";
import { useSocketStore } from "~/utils/store";

type OrganizationId = {
	id: string;
};

const useOrganizationWebsocket = (orgIds: OrganizationId[]) => {
	const setupSocket = useSocketStore((state) => state.setupSocket);
	const cleanupSocket = useSocketStore((state) => state.cleanupSocket);

	useEffect(() => {
		// Call setupSocket when the component mounts or orgIds change
		if (orgIds && orgIds.length > 0) {
			setupSocket(orgIds);
		}

		// Return a function that calls cleanupSocket when the component unmounts
		return () => {
			cleanupSocket();
		};
	}, [orgIds, setupSocket, cleanupSocket]); // Dependencies array
};

export default useOrganizationWebsocket;
