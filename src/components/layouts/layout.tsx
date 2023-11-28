import { type ReactNode } from "react";
import FourOhFour from "~/pages/404";
import Header from "./header";
import Sidebar from "./sidebar";
import Footer from "./footer";
import { globalSiteTitle } from "~/utils/global";
import Link from "next/link";
import { useRouter } from "next/router";
import { User } from "@prisma/client";
import { api } from "~/utils/api";
import { useSidebarStore, useAsideStore } from "~/utils/store";
import ChatAside from "./chatAside";
import { LogsFooter } from "./logFooter";
import Modal from "../shared/modal";

type TUser = {
	user: User;
};
interface Props {
	children: ReactNode;
	props?: TUser;
}

export const LayoutPublic = ({ children }: Props): JSX.Element => {
	const router = useRouter();
	const { data: options, isLoading: loadingRegistration } =
		api.public.registrationAllowed.useQuery();

	const currentPath = router.pathname;
	return (
		<div className="outer-content">
			<div className="mx-auto flex w-5/6">
				<div>
					<h1 className="mb-3 text-5xl font-bold">{globalSiteTitle}</h1>
				</div>

				<div className="m-3 mx-0 flex w-10/12 justify-end">
					{options?.enableRegistration && !loadingRegistration ? (
						<Link
							href={
								currentPath.includes("/auth/register") ? "/auth/login" : "/auth/register"
							}
							className="btn"
						>
							{currentPath === "/auth/register" ? "Login" : "Sign Up"}
						</Link>
					) : null}
				</div>
			</div>
			{children}
		</div>
	);
};

export const LayoutAuthenticated = ({ children }: Props): JSX.Element => {
	// if not session.user redirect to login
	const { open } = useSidebarStore();
	return (
		<div className="outer-content">
			<Modal />
			<Header />
			<div className="flex">
				<aside className={`duration-150 ${open ? "w-64" : "w-0 opacity-0"}`}>
					<Sidebar />
				</aside>
				<div
					className={`flex-grow custom-overflow custom-scrollbar ${
						!open ? "flex-grow" : ""
					}`}
				>
					{children}
					<Footer />
				</div>
			</div>
		</div>
	);
};
export const LayoutOrganizationAuthenticated = ({ children }: Props): JSX.Element => {
	// if not session.user redirect to login
	const { open: sidebarOpen } = useSidebarStore();
	const { open: asideOpen } = useAsideStore();

	return (
		<div className="outer-content grid grid-rows-[auto_1fr] min-h-screen">
			{/* Header */}
			<Modal />
			<Header />

			{/* Main Content including Sidebar, Content, and Chat Aside */}
			<div className="flex flex-grow relative ">
				{/* Sidebar */}
				<aside className={`duration-150 ${sidebarOpen ? "w-64" : "w-0 opacity-0"}`}>
					<Sidebar />
				</aside>

				{/* Main Content */}
				<div
					className={`flex-grow custom-scrollbar custom-overflow transition-all duration-150 ${
						asideOpen ? "mr-72" : ""
					}`}
				>
					{children}
					{/* Logs Footer */}
					<LogsFooter sidebarOpen={sidebarOpen} asideOpen={asideOpen} />
				</div>

				{/* Chat Aside */}
				<ChatAside />
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
		<div className="outer-content">
			<Modal />
			<Header />
			<div className="flex">
				<aside className={`duration-150 ${open ? "w-64" : "w-0 opacity-0"}`}>
					<Sidebar />
				</aside>
				<div
					className={`flex-grow custom-overflow custom-scrollbar ${
						!open ? "flex-grow" : ""
					}`}
				>
					{children}
					<Footer />
				</div>
			</div>
		</div>
	);
};
