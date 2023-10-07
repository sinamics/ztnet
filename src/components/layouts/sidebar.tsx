import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useSidebarStore } from "~/utils/store";
import { api } from "~/utils/api";

// Custom hook to check if the screen width is below the 'md' breakpoint
const useIsBelowMd = () => {
	const [isBelowMd, setIsBelowMd] = useState(false);

	useEffect(() => {
		const checkSize = () => {
			setIsBelowMd(window.innerWidth < 768);
		};

		checkSize();
		window.addEventListener("resize", checkSize);

		return () => {
			window.removeEventListener("resize", checkSize);
		};
	}, []);

	return isBelowMd;
};

const Sidebar = (): JSX.Element => {
	const { open, setOpenState } = useSidebarStore();
	const { data: session } = useSession();
	const { data: me } = api.auth.me.useQuery();
	const t = useTranslations("sidebar");
	const isBelowMd = useIsBelowMd();
	const sidebarRef = useRef<HTMLDivElement>();
	const router = useRouter();

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (isBelowMd && open) {
				if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
					// called after the click event on hamburger menu to close sidebar
					setTimeout(() => {
						setOpenState(false);
					}, 100);
				}
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isBelowMd, open, setOpenState, sidebarRef]);

	return (
		<aside
			ref={sidebarRef}
			className={`overflow-y-auto fixed z-10 h-full bg-base-200 transition-transform duration-150 ease-in md:relative md:shadow
			${open ? "w-64" : "w-0"}`}
		>
			<div className="sidebar-content px-4 py-3">
				<ul className="flex w-full flex-col">
					<li className="my-px">
						<span className="my-4 flex px-4 text-sm font-medium uppercase text-primary">
							{t("navigation")}
						</span>
					</li>
					<li className="my-px">
						<Link
							href="/dashboard"
							className={`flex h-10 flex-row items-center rounded-lg px-3  
              ${
								router.pathname === "/dashboard"
									? "bg-gray-100 text-gray-700"
									: "hover:bg-slate-700"
							}`}
						>
							<span className="flex items-center justify-center text-lg text-gray-400">
								{/* https://heroicons.com/  */}
								<svg
									fill="none"
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									viewBox="0 0 24 24"
									stroke="currentColor"
									className="h-6 w-6"
								>
									<path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
								</svg>
							</span>
							<span className="ml-3"> {t("dashboard")}</span>
						</Link>
					</li>

					<li className="my-px">
						<Link
							href="/network"
							className={`flex h-10 flex-row items-center rounded-lg px-3 
              ${
								router.pathname.includes("/network")
									? "bg-gray-100 text-gray-700"
									: "hover:bg-slate-700"
							}`}
						>
							<span className="flex items-center justify-center text-lg text-gray-400">
								{/* https://heroicons.com/  */}
								<svg
									fill="none"
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									viewBox="0 0 24 24"
									stroke="currentColor"
									className="h-6 w-6"
								>
									<path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
								</svg>
							</span>
							<span className="ml-3">{t("networks")}</span>
						</Link>
					</li>
					{me?.options?.ztCentralApiKey ? (
						<li className="my-px">
							<Link
								href="/central"
								className={`flex h-10 flex-row items-center rounded-lg px-3 
              ${
								router.pathname.includes("/central")
									? "bg-gray-100 text-gray-700"
									: "hover:bg-slate-700"
							}`}
							>
								{/* https://heroicons.com/  */}
								<span className="flex items-center justify-center text-lg text-gray-400">
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
											d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
										/>
									</svg>
								</span>
								<span className="ml-3">
									{`${t("ztCentral")} `}
									<div className="badge badge-primary p-1 text-[0.6rem]">BETA</div>
								</span>
							</Link>
						</li>
					) : null}
					{session?.user.role === "ADMIN" ? (
						<>
							<li className="my-px">
								<span className="my-4 flex px-4 text-sm font-medium uppercase text-primary ">
									{t("admin")}
								</span>
							</li>
							<li className="my-px">
								<Link
									href="/admin?tab=site-setting"
									className={`flex h-10 flex-row items-center rounded-lg px-3 
              ${
								router.pathname === "/admin" && router.query.tab === "site-setting"
									? "bg-gray-100 text-gray-700"
									: "hover:bg-slate-700"
							}`}
								>
									<span className="flex items-center justify-center text-lg text-gray-400">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
											stroke-width="1.5"
											stroke="currentColor"
											className="w-6 h-6"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z"
											/>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
											/>
										</svg>
									</span>
									<span className="ml-3">{t("settings")}</span>
								</Link>
							</li>
							<li className="my-px">
								<Link
									href="/admin?tab=mail-setting"
									className={`flex h-10 flex-row items-center rounded-lg px-3 
              ${
								router.pathname === "/admin" && router.query.tab === "mail-setting"
									? "bg-gray-100 text-gray-700"
									: "hover:bg-slate-700"
							}`}
								>
									<span className="flex items-center justify-center text-lg text-gray-400">
										<svg viewBox="0 0 512 512" fill="currentColor" className="h-6 w-6">
											<path
												fill="none"
												stroke="currentColor"
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={32}
												d="M441.6 171.61L266.87 85.37a24.57 24.57 0 00-21.74 0L70.4 171.61A40 40 0 0048 207.39V392c0 22.09 18.14 40 40.52 40h335c22.38 0 40.52-17.91 40.52-40V207.39a40 40 0 00-22.44-35.78z"
											/>
											<path
												fill="none"
												stroke="currentColor"
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={32}
												d="M397.33 368L268.07 267.46a24 24 0 00-29.47 0L109.33 368M309.33 295l136-103M61.33 192l139 105"
											/>
										</svg>
									</span>
									<span className="ml-3">{t("mail")}</span>
								</Link>
							</li>
							<li className="my-px">
								<Link
									href="/admin?tab=users"
									className={`flex h-10 flex-row items-center rounded-lg px-3 
              ${
								router.pathname === "/admin" && router.query.tab === "users"
									? "bg-gray-100 text-gray-700"
									: "hover:bg-slate-700"
							}`}
								>
									<span className="flex items-center justify-center text-lg text-gray-400">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
											strokeWidth="1.5"
											stroke="currentColor"
											className="h-6 w-6"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
											/>
										</svg>
									</span>
									<span className="ml-3">{t("users")}</span>
								</Link>
							</li>
							<li className="my-px">
								<Link
									href="/admin?tab=notification"
									className={`flex h-10 flex-row items-center rounded-lg px-3 
              					${
													router.pathname === "/admin" &&
													router.query.tab === "notification"
														? "bg-gray-100 text-gray-700"
														: "hover:bg-slate-700"
												}`}
								>
									<span className="flex items-center justify-center text-lg text-gray-400">
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
												d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0M3.124 7.5A8.969 8.969 0 015.292 3m13.416 0a8.969 8.969 0 012.168 4.5"
											/>
										</svg>
									</span>
									<span className="ml-3">{t("notification")}</span>
								</Link>
							</li>
							<li className="my-px">
								<Link
									href="/admin?tab=controller"
									className={`flex h-10 flex-row items-center rounded-lg px-3 
              					${
													router.pathname === "/admin" &&
													router.query.tab === "controller"
														? "bg-gray-100 text-gray-700"
														: "hover:bg-slate-700"
												}`}
								>
									<span className="flex items-center justify-center text-lg text-gray-400">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
											strokeWidth="1.5"
											stroke="currentColor"
											className="h-6 w-6"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z"
											/>
										</svg>
									</span>
									<span className="ml-3">{t("controller")}</span>
								</Link>
							</li>
						</>
					) : null}
					<li className="my-px">
						<span className="my-4 flex px-4 text-sm font-medium uppercase text-primary">
							{t("account")}
						</span>
					</li>
					<li className="my-px">
						<Link
							href="/user-settings?tab=account"
							className={`flex h-10 flex-row items-center rounded-lg px-3 
              ${
								router.pathname.includes("/user-settings")
									? "bg-gray-100 text-gray-700"
									: "hover:bg-slate-700"
							}`}
						>
							<span className="flex items-center justify-center text-lg text-gray-400">
								<svg
									fill="none"
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									viewBox="0 0 24 24"
									stroke="currentColor"
									className="h-6 w-6"
								>
									<path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
								</svg>
							</span>
							<span className="ml-3">{t("user-settings")}</span>
						</Link>
					</li>
					<li className="my-px">
						<a
							href="#"
							onClick={() => void signOut({ callbackUrl: "/" })}
							className="flex h-10 flex-row items-center rounded-lg px-3 text-gray-300 hover:bg-gray-100 hover:text-gray-700"
						>
							<span className="flex items-center justify-center text-lg text-red-400">
								<svg
									fill="none"
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									viewBox="0 0 24 24"
									stroke="currentColor"
									className="h-6 w-6"
								>
									<path d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
								</svg>
							</span>
							<span className="ml-3">{t("logout")}</span>
						</a>
					</li>
				</ul>
			</div>
		</aside>
	);
};

export default Sidebar;
