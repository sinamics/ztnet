"use client";

import { WebSocketProvider as Provider } from "next-ws/client";
// import { useEffect, useState } from "react";

export const WebsocketProvider = ({ children }) => {
	// State to store the WebSocket URL
	// const [webSocketUrl, setWebSocketUrl] = useState<string>("/api/ws");

	// useEffect(() => {
	// 	// Dynamically construct the WebSocket URL based on the current location
	// 	if (typeof window !== "undefined") {
	// 		const { protocol, host } = window.location;
	// 		const wsProtocol = protocol === "https:" ? "wss:" : "ws:";
	// 		setWebSocketUrl(`${wsProtocol}//${host}/api/ws`);
	// 	}
	// }, []);
	// console.log(webSocketUrl);
	return <Provider url="/api/ws">{children}</Provider>;
};
