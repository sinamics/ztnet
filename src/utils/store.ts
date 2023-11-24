import { create } from "zustand";
import { Socket, io } from "socket.io-client";
interface StoreI {
	open: boolean;
	toggle: () => void;
	setOpenState: (state: boolean) => void;
}
interface SocketStore {
	socket: Socket | null;
	initializeSocket: () => void;
	// Add more methods as needed
}

export const useSidebarStore = create<StoreI>((set) => ({
	open: false,
	toggle: () => set((state) => ({ open: !state.open })),
	setOpenState: (state: boolean) => set(() => ({ open: state })),
}));

export const useAsideStore = create<StoreI>((set) => ({
	open: false,
	toggle: () => set((state) => ({ open: !state.open })),
	setOpenState: (state: boolean) => set(() => ({ open: state })),
}));

type IcallModal = {
	title: string;
	description: string;
	content: JSX.Element;
	yesAction: () => void | null;
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

export const useSocketStore = create<SocketStore>((set) => ({
	socket: null,

	initializeSocket: async () => {
		await fetch("/api/websocket");
		const socket = io({ transports: ["websocket"] });

		socket.on("connect", () => {
			// rome-ignore lint/nursery/noConsoleLog: <explanation>
			console.log("connected from zustand store");
			// Handle connection established
		});

		socket.on("disconnect", () => {
			// rome-ignore lint/nursery/noConsoleLog: <explanation>
			console.log("disconnected from zustand store");
			// Handle disconnection
		});

		// Update the store with the socket instance
		set({ socket });
	},

	// Additional methods can be added here
}));
