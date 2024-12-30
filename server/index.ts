import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
	cors: {
		origin: "*", // Allow all origins during development
	},
});

// Types for messages and users
type Message = {
	id: number;
	content: string;
	sender: string;
	roomId: string;
	avatar?: string;
};

type User = {
	userId: string;
	socketId: string;
	username: string;
	avatar: string;
};

// Data store for messages and online users
const messages = new Map<string, Message[]>(); // Room ID -> Messages
const onlineUsers = new Map<string, User[]>(); // Room ID -> Online Users
const typingUsers = new Map<string, Set<User>>(); // Room ID -> Set of userIds currently typing

io.on("connection", (socket) => {
	// biome-ignore lint/suspicious/noConsoleLog: <explanation>
	console.log(`🔗 User connected: ${socket.id}`);

	// Handle joining a room
	socket.on("join_room", (roomId: string, userInfo: User) => {
		// biome-ignore lint/suspicious/noConsoleLog: <explanation>
		console.log(`🚪 User ${userInfo.username} joined room: ${roomId}`);
		socket.join(roomId);

		// Add user to the room's online users
		const usersInRoom = onlineUsers.get(roomId) || [];
		const newUser = { ...userInfo, socketId: socket.id };
		onlineUsers.set(roomId, [...usersInRoom, newUser]);

		// Notify the room about the updated user list
		io.to(roomId).emit("room_data", {
			roomId,
			onlineUsers: onlineUsers.get(roomId) || [],
			messages: messages.get(roomId) || [],
		});
	});

	// Listen for 'send_message' events
	socket.on("send_message", (message: Message) => {
		const roomMessages = messages.get(message.roomId) || [];
		const newMessage = { ...message, id: roomMessages.length + 1 };
		messages.set(message.roomId, [...roomMessages, newMessage]);

		// Broadcast the new message to the room
		io.to(message.roomId).emit("room_data", {
			roomId: message.roomId,
			onlineUsers: onlineUsers.get(message.roomId) || [],
			messages: messages.get(message.roomId) || [],
		});
		// biome-ignore lint/suspicious/noConsoleLog: <explanation>
		console.log(`💬 Message sent in room ${message.roomId}:`, message.content);
	});

	// Notify room when a user starts typing
	socket.on("start_typing", (user: User & { roomId: string }) => {
		const { roomId, userId } = user;
		// biome-ignore lint/suspicious/noConsoleLog: <explanation>
		console.log(`✍️ ${user.username} is typing in room: ${roomId}`);

		// Initialize the room's typing set if it doesn't exist
		if (!typingUsers.has(roomId)) {
			typingUsers.set(roomId, new Set());
		}

		const usersTyping = typingUsers.get(roomId)!;

		// Only add the user if they are not already in the typing list
		if (![...usersTyping].some((typingUser) => typingUser.userId === userId)) {
			usersTyping.add(user);
		}

		io.to(roomId).emit("typing", {
			roomId,
			user,
			typingUsers: Array.from(usersTyping),
		});
	});

	// Notify room when a user stops typing
	socket.on("stop_typing", (user: User & { roomId: string }) => {
		const { roomId, userId } = user;
		// biome-ignore lint/suspicious/noConsoleLog: <explanation>
		console.log(`🛑 ${user.username} stopped typing in room: ${roomId}`);

		// Remove user from the typing set for the room
		const usersTyping = typingUsers.get(roomId) || new Set();
		typingUsers.set(
			roomId,
			new Set([...usersTyping].filter((typingUser) => typingUser.userId !== userId)),
		);

		io.to(roomId).emit("stop_typing", {
			roomId,
			user,
			typingUsers: Array.from(typingUsers.get(roomId) || []),
		});
	});

	// Handle disconnection
	socket.on("disconnect", () => {
		// biome-ignore lint/suspicious/noConsoleLog: <explanation>
		console.log(`❌ User disconnected: ${socket.id}`);

		// Remove user from all rooms they were part of
		for (const [roomId, users] of onlineUsers) {
			const updatedUsers = users.filter((user) => user.socketId !== socket.id);
			onlineUsers.set(roomId, updatedUsers);

			// Notify the room about the updated user list
			io.to(roomId).emit("room_data", {
				roomId,
				onlineUsers: updatedUsers,
				messages: messages.get(roomId) || [],
			});
		}
	});
});

// Start the server
const PORT = 4000;
app.get("/", (_req, res) => {
	res.json({ message: "BOOM! Server is running...🚀" });
});
server.listen(PORT, () => {
	// biome-ignore lint/suspicious/noConsoleLog: <explanation>
	console.log(`🚀 Server running at http://localhost:${PORT}`);
});
