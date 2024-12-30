import { useEffect, useMemo } from "react";
import { io, Socket } from "socket.io-client";

const useSocket = (url: string): Socket => {
	const socket: Socket = useMemo(() => io(url), [url]);

	useEffect(() => {
		// Clean up the socket connection when the component unmounts
		return () => {
			socket.disconnect();
		};
	}, [socket]);

	return socket;
};

export default useSocket;
