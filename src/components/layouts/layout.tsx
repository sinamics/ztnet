import { type ReactNode } from "react";
import FourOhFour from "~/pages/404";
import Header from "./header";
import Sidebar from "./sidebar";
import Footer from "./footer";
import { useRouter } from "next/router";
import { User } from "@prisma/client";
import { useSidebarStore, useAsideChatStore, useFontSizeStore } from "~/utils/store";
import ChatAside from "./chatAside";
import { LogsFooter } from "./logFooter";
import Modal from "../shared/modal";
import { OrgNavBar } from "../organization/orgNavBar";
import useDynamicViewportHeight from "~/hooks/useDynamicViewportHeight";
import { WelcomeMessage } from "../auth/welcomeMessage";

type TUser = {
	user: User;
};
interface Props {
	children: ReactNode;
	props?: TUser;
}

export const LayoutPublic = ({ children }: Props): JSX.Element => {
	return (
		<div className="outer-container">
			<main className="min-h-dvh container mx-auto flex items-center justify-center">
				{/* Main section */}
				<div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 w-full max-w-7xl m-5 sm:m-0">
					<div className="h-full flex items-start">
						<WelcomeMessage />
					</div>
					<div>{children}</div>
				</div>
			</main>
		</div>
	);
};

export const LayoutAuthenticated = ({ children }: Props): JSX.Element => {
	const { open } = useSidebarStore();
	const { fontSize } = useFontSizeStore();
	const headerRef = useDynamicViewportHeight([fontSize]);

	return (
		<div className="outer-container">
			<Modal />
			<Header ref={headerRef} />
			<div className="flex">
				<aside className={`duration-150 ${open ? "w-64" : "w-0 opacity-0"}`}>
					<Sidebar />
				</aside>
				<div className="lg:grid lg:grid-rows-[1fr_auto] inner-container w-full custom-scrollbar">
					<div className={`grow custom-scrollbar ${!open ? "grow" : ""}`}>
						{children}
					</div>
					<Footer />
				</div>
			</div>
		</div>
	);
};

export const LayoutAdminAuthenticated = ({ children, props }: Props): JSX.Element => {
	const { open } = useSidebarStore();
	const isAdmin = props?.user?.role === "ADMIN";
	if (!isAdmin) {
		return <FourOhFour />;
	}
	return (
		<div className="outer-container">
			<Modal />
			<Header />
			<div className="flex">
				<aside className={`duration-150 ${open ? "w-64" : "w-0 opacity-0"}`}>
					<Sidebar />
				</aside>
				<div className="lg:grid lg:grid-rows-[1fr_auto] inner-container w-full custom-scrollbar">
					<div className={`grow  custom-scrollbar ${!open ? "grow" : ""}`}>
						{children}
					</div>
					<Footer />
				</div>
			</div>
		</div>
	);
};

export const LayoutOrganizationAuthenticated = ({ children }: Props): JSX.Element => {
	// if not session.user redirect to login
	const sidebarOpen = useSidebarStore((state) => state.open);
	const openChats = useAsideChatStore((state) => state.openChats);

	const { fontSize } = useFontSizeStore();
	const headerRef = useDynamicViewportHeight([fontSize]);

	const router = useRouter();
	const orgId = router.query.orgid as string;

	return (
		<div className="outer-container">
			{/* Header */}
			<Modal />
			<Header ref={headerRef} />

			{/* Main Content including Sidebar, Content, and Chat Aside */}
			<div className="flex grow relative ">
				<aside className={`duration-150 ${sidebarOpen ? "w-64" : "w-0 opacity-0"}`}>
					<Sidebar />
				</aside>

				{/* Main Content */}
				<div
					className={`grow custom-scrollbar inner-container transition-all duration-150 ${
						openChats.includes(orgId) ? "mr-72" : ""
					}`}
				>
					<div className="px-5 lg:px-10 space-y-5 pt-10">
						<OrgNavBar />
						{children}
						{/* Logs Footer */}
						<LogsFooter sidebarOpen={sidebarOpen} asideOpen={openChats.includes(orgId)} />
					</div>
				</div>

				{/* Chat Aside */}
				<ChatAside />
			</div>
		</div>
	);
};
