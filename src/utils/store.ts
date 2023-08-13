import { create } from "zustand";

interface StoreI {
	open: boolean;
	toggle: () => void;
}

export const useSidebarStore = create<StoreI>((set) => ({
	open: false,
	toggle: () => set((state) => ({ open: !state.open })),
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
