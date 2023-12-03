import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { Server } from "socket.io";
import { authOptions } from "~/server/auth";

interface SocketIoExtension {
	socket: {
		server: {
			io: Server;
		};
	};
}

export type NextApiResponseWithSocketIo = NextApiResponse & SocketIoExtension;
const SocketHandler = async (req: NextApiRequest, res: NextApiResponseWithSocketIo) => {
	const session = await getServerSession(req, res, authOptions);
	if (!session) {
		res.status(401).json({ message: "Authorization Error" });
		return;
	}

	if (!res.socket.server.io) {
		// biome-ignore lint/suspicious/noConsoleLog: <explanation>
		console.log("Socket is initializing");

		//@ts-expect-error assinging to a property that doesn't exist
		const io = new Server(res.socket.server, {
			addTrailingSlash: false,
		});
		res.socket.server.io = io;

		// io.on("connection", (socket) => {
		// 	socket.on("join", ({ roomId }) => {
		// 		socket.join(roomId);
		// 	});
		// });
	}
	res.end();
};

export const config = {
	api: {
		bodyParser: false,
	},
};

export default SocketHandler;
