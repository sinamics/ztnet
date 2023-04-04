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
  yesAction: () => void;
  disableClickOutside: boolean;
};

type ModalStore = {
  toggleModal?: () => void;
  isOpen?: boolean;
  disableClickOutside: boolean;
  callModal: (IcallModal) => void;
  description?: string;
  title?: string;
  yesAction?: () => void;
  closeModal?: () => void;
};

export const useModalStore = create<ModalStore>((set, get) => ({
  isOpen: false,
  disableClickOutside: false,
  closeModal: () => set(() => ({ isOpen: false })),
  toggleModal: () => set((state) => ({ isOpen: !state.isOpen })),
  callModal: (data: IcallModal) => {
    const { toggleModal } = get();
    toggleModal();
    set({ ...data });
  },
}));
