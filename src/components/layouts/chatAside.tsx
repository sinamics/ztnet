import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { api } from "~/utils/api";
import { useAsideChatStore, useSocketStore } from "~/utils/store";
import TimeAgo from "react-timeago";
import { stringToColor } from "~/utils/randomColor";
import { ErrorData } from "~/types/errorHandling";
import toast from "react-hot-toast";

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

const MessagesList = ({ messages }) => {
	// Generate a color for the user
	const userColor = stringToColor(messages.user.name);

	return (
		<div
			title={messages.user.email}
			className="flex items-start p-4 hover:bg-gray-700 cursor-pointer space-x-3"
		>
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
	const { openChats, toggleChat } = useAsideChatStore();
	const [messages, setMessages] = useState([]);
	const { messages: newMessages, hasNewMessages } = useSocketStore();

	const [inputMsg, setInputMsg] = useState({ chatMessage: "" });
	const query = useRouter().query;
	const orgId = query.orgid as string;
	const messageEndRef = useRef(null);

	const { mutate: markMessagesAsRead } = api.org.markMessagesAsRead.useMutation();
	const { mutate: emitChatMsg } = api.org.sendMessage.useMutation();
	const { data: orgMessages } = api.org.getMessages.useQuery(
		{ organizationId: orgId },
		{
			enabled: !!orgId,
		},
	);

	useEffect(() => {
		if (!orgMessages) return;
		setMessages(orgMessages);
	}, [orgMessages]);

	// Effect to handle new messages from the store
	useEffect(() => {
		// Merge new messages with existing messages in state
		setMessages((currentMessages) => {
			// Create a map to track seen message IDs
			const seen = new Set();
			if (!newMessages[orgId]) return;
			// Combine current and new messages and filter out duplicates
			const mergedMessages = [...currentMessages, ...newMessages[orgId]].filter(
				(message) => {
					const duplicate = seen.has(message.id);
					seen.add(message.id);
					return !duplicate;
				},
			);

			return mergedMessages;
		});
	}, [newMessages]);

	// Scroll to the bottom of the chat when new messages are added
	useEffect(() => {
		scrollToBottom();
	}, [messages]);

	// Mark messages as read when the aside is opened
	useEffect(() => {
		if (openChats.includes(orgId)) {
			markMessagesAsRead({
				organizationId: orgId,
			});
		}
	}, [openChats, orgId]);

	const scrollToBottom = () => {
		messageEndRef.current?.scrollIntoView({ behavior: "instant" });
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
			{ organizationId: orgId, message: inputMsg.chatMessage },
			{
				onSuccess: () => {
					setInputMsg({ chatMessage: "" });
				},
				onError: (error) => {
					if ((error.data as ErrorData)?.zodError) {
						const fieldErrors = (error.data as ErrorData)?.zodError.fieldErrors;
						for (const field in fieldErrors) {
							toast.error(`${fieldErrors[field].join(", ")}`);
						}
					} else if (error.message) {
						toast.error(error.message);
					} else {
						toast.error("An unknown error occurred");
					}
				},
			},
		);
	};
	return (
		<>
			{/* Chat Toggle Button */}
			<button
				className={`w-14 z-10 fixed right-2 top-20 transition-all duration-150 ${
					openChats.includes(orgId) ? "mr-72" : "w-0"
				}`}
				aria-label="Toggle chat"
				onClick={() => toggleChat(orgId)}
			>
				<div className="flex items-center relative">
					{/* Replace with an actual chat icon */}
					{openChats.includes(orgId) ? (
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							strokeWidth="1.5"
							stroke="currentColor"
							className="w-6 h-6"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M8.25 4.5l7.5 7.5-7.5 7.5"
							/>
						</svg>
					) : (
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							strokeWidth="1.5"
							stroke="currentColor"
							className="w-6 h-6"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M15.75 19.5L8.25 12l7.5-7.5"
							/>
						</svg>
					)}
					<div className="relative">
						<span className="text-xs">MSG</span>
						{hasNewMessages[orgId] ? (
							<span className="absolute bg-red-400 w-2 h-2 rounded-lg -left-1 top-1 glow" />
						) : null}
					</div>
				</div>
			</button>
			{/* Chat Aside Panel */}
			<aside
				className={`fixed h-full right-0 bg-base-200 shadow-md transition-all duration-150 ${
					openChats.includes(orgId) ? "w-72" : "w-0 opacity-0"
				}`}
			>
				<div
					className={`h-full bg-base-200 transition-transform duration-150 ease-in md:relative md:shadow ${
						openChats.includes(orgId) ? "w-72" : "w-0"
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
			</aside>
		</>
	);
};

export default ChatAside;
