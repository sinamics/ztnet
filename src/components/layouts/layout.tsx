import { type ReactNode } from "react";
import FourOhFour from "~/pages/404";
import Header from "./header";
import Sidebar from "./sidebar";
import Footer from "../modules/footer";
import { globalSiteTitle } from "~/utils/global";
import Link from "next/link";
import { useRouter } from "next/router";
import { User } from "@prisma/client";
import { api } from "~/utils/api";
import { useSidebarStore } from "~/utils/store";

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
		api.settings.registrationAllowed.useQuery();

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
	const { open } = useSidebarStore();
	return (
		<div className="outer-content">
			<Header />
			<div className="flex">
				<aside className={`transition-all duration-150 ease-in ${open ? "w-64" : "w-0 opacity-0"}`}>
					<Sidebar />
				</aside>
				<div className={`flex-grow custom-overflow custom-scrollbar ${!open ? "flex-grow" : ""}`}>
					{children}
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
		<div className="outer-content">
			<Header />
			<div className="flex">
				<aside className={`transition-all duration-150 ease-in ${open ? "w-64" : "w-0 opacity-0"}`}>
					<Sidebar />
				</aside>
				<div className={`flex-grow custom-overflow custom-scrollbar ${!open ? "flex-grow" : ""}`}>
					{children}
					<Footer />
				</div>
			</div>
		</div>
	);
};
