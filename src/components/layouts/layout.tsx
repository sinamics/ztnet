import { type ReactNode } from "react";
import FourOhFour from "~/pages/404";
import Header from "./header";
import Sidebar from "./sidebar";
import Footer from "../modules/footer";
import { globalSiteTitle } from "~/utils/global";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";

interface Props {
	children: ReactNode;
}

export const LayoutPublic = ({ children }: Props): JSX.Element => {
	const router = useRouter();
	const currentPath = router.pathname;
	return (
		<div className="outer-content">
			<div className="mx-auto flex w-5/6">
				<div>
					<h1 className="mb-3 text-5xl font-bold">{globalSiteTitle}</h1>
				</div>

				<div className="m-3 mx-0 flex w-10/12 justify-end">
					<Link
						href={
							currentPath.includes("/auth/register") ? "/auth/login" : "/auth/register"
						}
						className="btn"
					>
						{currentPath === "/auth/register" ? "Login" : "Sign Up"}
					</Link>
				</div>
			</div>
			{children}
		</div>
	);
};

export const LayoutAuthenticated = ({ children }: Props): JSX.Element => {
	return (
		<div className="outer-content">
			<Header />
			<div className="grid md:grid-cols-[255px,minmax(0,1fr)]">
				<Sidebar />
				<div className="custom-overflow custom-scrollbar">
					{children}
					<Footer />
				</div>
			</div>
		</div>
	);
};
export const LayoutAdminAuthenticated = ({ children }: Props): JSX.Element => {
	// check if role is admin
	const { data } = useSession();
	const isAdmin = data?.user?.role === "ADMIN";
	if (!isAdmin) {
		return <FourOhFour />;
	}
	return (
		<div className="outer-content">
			<Header />
			<div className="grid md:grid-cols-[255px,minmax(0,1fr)]">
				<Sidebar />
				<div className="custom-overflow custom-scrollbar">
					{children}
					<Footer />
				</div>
			</div>
		</div>
	);
};
