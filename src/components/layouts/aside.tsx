import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { api } from "~/utils/api";
import { useAsideStore } from "~/utils/store";
import TimeAgo from "react-timeago";
import { Socket, io } from "socket.io-client";
import { DefaultEventsMap } from "@socket.io/component-emitter";

const TimeAgoFormatter = (value: string, unit: string) => {
	// Map full unit names to their abbreviations
	const unitAbbreviations: { [key: string]: string } = {
		second: "s ago",
		minute: "m ago",
		hour: "h ago",
		day: "d ago",
		week: "w ago",
		month: "mo ago",
		year: "ye ago",
	};
	const abbreviation = unitAbbreviations[unit] || unit;

	return `${value} ${abbreviation}`;
};

const stringToColor = (str) => {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = str.charCodeAt(i) + ((hash << 5) - hash);
	}

	const h = hash % 360;
	return `hsl(${h}, 100%, 30%)`; // Using 100% saturation and 30% lightness for deep colors
};

const MessagesList = ({ messages }) => {
	// Generate a color for the user
	const userColor = stringToColor(messages.user.name);

	return (
		<div className="flex items-start p-4 hover:bg-gray-700 cursor-pointer space-x-3">
			{/* User icon */}
			<div
				className="flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-white uppercase"
				style={{ backgroundColor: userColor }}
			>
				{messages.user.name[0]}
			</div>
			{/* Message content and timestamp */}
			<div className="flex-grow min-w-0">
				<div className="flex justify-between items-center">
					<p className="text-sm font-medium truncate">{messages.user.name}</p>
					<p className="text-xs text-gray-400 ml-2 whitespace-nowrap">
						<TimeAgo date={messages.createdAt} formatter={TimeAgoFormatter} />
					</p>
				</div>
				<p className="text-xs text-gray-400">{messages.content}</p>
			</div>
		</div>
	);
};

const ChatAside = () => {
	const { open: asideOpen } = useAsideStore();
	const [messages, setMessages] = useState([]);
	const [inputMsg, setInputMsg] = useState({ chatMessage: "" });
	const query = useRouter().query;
	const orgId = query.id as string;
	const messageEndRef = useRef(null);

	const { mutate: emitChatMsg } = api.org.sendMessage.useMutation();
	const { data: orgMessages } = api.org.getMessages.useQuery({ orgId });

	useEffect(() => {
		let socket: Socket<DefaultEventsMap, DefaultEventsMap>;

		const handleNewMessage = (message) => {
			// Add a check to ensure the message doesn't already exist
			setMessages((prevMessages) => {
				if (!prevMessages.some((msg) => msg.id === message.id)) {
					return [...prevMessages, message];
				}
				return prevMessages;
			});
		};

		const initializeSocket = async () => {
			await fetch("/api/websocket");
			socket = io();

			// Listen for new messages on the socket
			if (socket) {
				socket.on("connect", () => {
					socket.on(orgId, handleNewMessage);
				});
			}
		};

		initializeSocket();

		// Cleanup function to be called when the component unmounts
		return () => {
			if (socket) {
				socket.off(orgId, handleNewMessage);
				socket.disconnect();
			}
		};
	}, [orgId]);

	useEffect(() => {
		scrollToBottom();
	}, [messages]);

	useEffect(() => {
		setMessages(orgMessages);
	}, [orgMessages]);

	const scrollToBottom = () => {
		messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	const eventHandler = (e) => {
		setInputMsg({
			...inputMsg,
			[e.target.name]: e.target.value,
		});
	};
	const sendMessage = (e) => {
		e.preventDefault();

		emitChatMsg(
			{ orgId, message: inputMsg.chatMessage },
			{
				onSuccess: () => {
					setInputMsg({ chatMessage: "" });
				},
			},
		);
	};
	return (
		<div
			className={`h-full bg-base-200 transition-transform duration-150 ease-in md:relative md:shadow ${
				asideOpen ? "w-72" : "w-0"
			}`}
		>
			{/* Chat Header */}
			<div className="p-4 border-b border-gray-200">
				<h2 className="text-lg font-semibold">Organization Messages</h2>
			</div>

			{/* Chat List with Scrollable Area */}
			<div className="overflow-y-auto h-[calc(100%-20rem)] custom-scrollbar pb-5">
				{/* Repeat for other chats */}
				{messages?.map((msg) => {
					return <MessagesList key={msg.id} messages={msg} />;
				})}
				<div ref={messageEndRef} />
			</div>

			{/* Fixed Message Input at Bottom */}
			<div className="p-4 border-t border-gray-200 mt-auto">
				<form className="space-y-5">
					<p className="text-xs">
						Everyone in the Organization will be able to see your message.
					</p>
					<input
						type="text"
						value={inputMsg.chatMessage}
						onChange={eventHandler}
						name="chatMessage"
						className="w-full p-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
						placeholder="Type a message..."
					/>
					<button type="submit" className="hidden" onClick={sendMessage} />
				</form>
			</div>
		</div>
	);
};

export default ChatAside;
