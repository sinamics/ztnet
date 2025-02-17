import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Socket, io } from "socket.io-client";

interface FontSizeStoreState {
	fontSize: string;
	setFontSize: (size: string) => void;
}

export const useFontSizeStore = create(
	persist<FontSizeStoreState>(
		(set) => ({
			fontSize: "Medium",
			setFontSize: (size: string) => set(() => ({ fontSize: size })),
		}),
		{
			name: "app-font-size",
		},
	),
);

interface IChat {
	openChats: string[];
	toggleChat: (orgId?: string) => void;
	closeChat: (orgId: string) => void;
}

export const useAsideChatStore = create(
	persist<IChat>(
		(set) => ({
			openChats: [],
			toggleChat: (orgId: string) => {
				set((state) => {
					const isOpen = state.openChats.includes(orgId);
					const newOpenChats = isOpen
						? state.openChats.filter((id) => id !== orgId)
						: [...state.openChats, orgId];

					// If opening the chat, reset hasNewMessages for this organization in useSocketStore
					if (!isOpen) {
						useSocketStore.getState().resetHasNewMessages(orgId);
					}

					return { openChats: newOpenChats };
				});
			},
			closeChat: (orgId: string) => {
				set((state) => ({
					openChats: state.openChats.filter((id) => id !== orgId),
				}));
			},
		}),
		{
			name: "chat-aside",
		},
	),
);

export const useLogAsideStore = create(
	persist<StoreI>(
		(set) => ({
			open: false,
			toggle: () => set((state) => ({ open: !state.open })),
			setOpenState: (state: boolean) => set(() => ({ open: state })),
		}),
		{
			name: "log-footer",
		},
	),
);

type IcallModal = {
	title: string;
	description: string;
	content: JSX.Element;
	yesAction: () => null;
	disableClickOutside: boolean;
};

type ModalStore = {
	toggleModal?: () => void;
	isOpen?: boolean;
	disableClickOutside: boolean;
	callModal: (IcallModal) => void;
	description?: string;
	content?: JSX.Element;
	rootStyle?: string;
	title?: string;
	showButtons?: boolean;
	yesAction?: () => void;
	closeModal?: () => void;
};

export const useModalStore = create<ModalStore>((set, get) => ({
	isOpen: false,
	description: "",
	content: null,
	title: "",
	rootStyle: "",
	showButtons: true,
	disableClickOutside: false,
	closeModal: () =>
		set(() => ({
			isOpen: false,
			showButtons: true,
			description: "",
			content: null,
			title: "",
			yesAction: null,
			rootStyle: "",
		})),
	toggleModal: () => set((state) => ({ isOpen: !state.isOpen })),
	callModal: (data: IcallModal) => {
		const { toggleModal } = get();
		toggleModal();
		set({ ...data });
	},
}));

interface Message {
	id: string;
	organizationId: string; // Add this line
}
interface SocketStoreState {
	messages: { [orgId: string]: Message[] };
	notifications: { [key: string]: { hasUnreadMessages: boolean } };
	setBulkNewMessages: (notifications: {
		[orgId: string]: { hasUnreadMessages: boolean };
	}) => void;
	hasNewMessages: { [key: string]: boolean };
	resetHasNewMessages: (orgId: string) => void;
	addMessage: (orgId: string, message: Message) => void;
	setupSocket: (orgId: IOrgId[]) => void;
	cleanupSocket: () => void;
	socket?: Socket; // Optional, if you want to keep a reference to the socket in the store
}

interface IOrgId {
	id: string;
}

export const useSocketStore = create<SocketStoreState>((set, get) => ({
	messages: {},
	notifications: {},
	hasNewMessages: {},
	resetHasNewMessages: (orgId: string) => {
		set((state) => ({
			...state,
			hasNewMessages: {
				...state.hasNewMessages,
				[orgId]: false,
			},
		}));
	},
	setBulkNewMessages: (notifications: {
		[orgId: string]: { hasUnreadMessages: boolean };
	}) => {
		const asideState = useAsideChatStore.getState();
		set((state) => ({
			...state,
			hasNewMessages: Object.keys(notifications).reduce(
				(acc, orgId) => {
					acc[orgId] =
						!asideState.openChats.includes(orgId) &&
						notifications[orgId].hasUnreadMessages;
					return acc;
				},
				{ ...state.hasNewMessages },
			),
		}));
	},
	addMessage: (orgId: string, message: Message) => {
		const asideState = useAsideChatStore.getState();

		set((state) => {
			const orgMessages = state.messages[orgId] || [];
			if (!orgMessages.some((msg) => msg.id === message.id)) {
				return {
					...state,
					messages: {
						...state.messages,
						[orgId]: [...orgMessages, message],
					},
					hasNewMessages: {
						...state.hasNewMessages,
						[orgId]: !asideState.openChats.includes(orgId),
					},
				};
			}
			return state; // No change if message already exists
		});
	},
	setupSocket: async (orgIds: IOrgId[]) => {
		await fetch("/api/websocket");
		const socket = io();

		socket.on("connect", () => {
			if (orgIds) {
				for (const org of orgIds) {
					socket.on(org.id, (message) => {
						get().addMessage(org.id, message);
					});
				}
			}
		});

		set({ socket });
	},
	cleanupSocket: () => {
		const { socket } = get();
		if (socket) {
			socket.disconnect();
		}
	},
}));
