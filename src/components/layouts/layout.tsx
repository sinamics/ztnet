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
import ChatAside from "./aside";

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
	const { open: sidebarOpen } = useSidebarStore();
	const { open: asideOpen, toggle: toggleAside } = useAsideStore();

	return (
		<div className="outer-content grid grid-rows-[auto_1fr] min-h-screen">
			{/* Header */}
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
						asideOpen ? "mr-64" : ""
					}`}
				>
					{children}
					<Footer />
				</div>

				{/* Chat Aside */}
				<aside
					className={`fixed h-full right-0 bg-base-200 shadow-md transition-all duration-150 ${
						asideOpen ? "w-72" : "w-0 opacity-0"
					}`}
				>
					<ChatAside />
				</aside>
				{/* Chat Toggle Button */}
				<button
					className="fixed right-0 top-20 mr-4"
					aria-label="Toggle chat"
					onClick={() => toggleAside()}
				>
					{/* Replace with an actual chat icon */}
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
							d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.157 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.67 1.09-.086 2.17-.208 3.238-.365 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
						/>
					</svg>
				</button>
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
