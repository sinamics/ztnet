export function GET() {
	const headers = new Headers();
	headers.set("Connection", "Upgrade");
	headers.set("Upgrade", "websocket");
	return new Response("Upgrade Required", { status: 426, headers });
}

export function SOCKET(
	client: import("ws").WebSocket,
	request: import("http").IncomingMessage,
	server: import("ws").WebSocketServer,
) {
	console.log("A client connected");

	client.on("message", (message) => {
		console.log("Received messagesssssssss:", message.toString());
		client.send(message);
	});

	client.on("close", () => {
		console.log("A client disconnected");
	});
}

function createHelpers(
	client: import("ws").WebSocket,
	server: import("ws").WebSocketServer,
) {
	const send = (payload: unknown) => client.send(JSON.stringify(payload));
	const broadcast = (payload: unknown) => {
		if (payload instanceof Buffer) payload = payload.toString();
		if (typeof payload !== "string") payload = JSON.stringify(payload);
		for (const other of server.clients) if (other !== client) other.send(String(payload));
	};
	return { send, broadcast };
}
