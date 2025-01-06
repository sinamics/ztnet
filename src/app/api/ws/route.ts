export function SOCKET(
	client: import("ws").WebSocket,
	request: import("http").IncomingMessage,
	server: import("ws").WebSocketServer,
) {
	console.log("A client connected");

	client.on("message", (message) => {
		console.log("Received message:", message);
		client.send(message);
	});

	client.on("close", () => {
		console.log("A client disconnected");
	});
}
