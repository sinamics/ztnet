"use client";
import ZtnetLogo from "docs/images/logo/ztnet_200x178.png";
import Link from "next/link";
import { api } from "~/utils/api";
import { useSession } from "next-auth/react";
import { useSidebarStore } from "~/store/sidebarStore";
import useStore from "~/store/useStore";
import ThemeSwitch from "../themeSwitch";

const Header = (props) => {
	const { data: session } = useSession();
	const store = useStore(useSidebarStore, (state) => state);
	const { data: globalOptions } = api.settings.getAllOptions.useQuery();

	return (
		<header className="header bg-base-200 px-4 py-1 shadow-md shadow-base" {...props}>
			<div className="header-content flex flex-row items-center">
				<div className="hidden md:inline-flex">
					<Link href="/network" className="inline-flex flex-row items-center gap-2">
						<img
							style={{ width: 25, height: 25 }}
							alt="ztnet logo"
							title="ztnet logo"
							src={ZtnetLogo.src}
						/>
						<span className="ml-1 text-2xl font-bold uppercase leading-10 text-accent zt-color">
							{globalOptions?.siteName || "ZTNET"}
						</span>
					</Link>
				</div>
				<div className="md:pl-12 flex items-center pt-1">
					<label className={`${store?.open ? "swap-active" : ""} swap swap-rotate`}>
						<div className="swap-off">
							<svg
								className="fill-current"
								xmlns="http://www.w3.org/2000/svg"
								width="32"
								height="32"
								viewBox="0 0 512 512"
								onClick={() => store?.toggle()}
							>
								<path d="M64,384H448V341.33H64Zm0-106.67H448V234.67H64ZM64,128v42.67H448V128Z" />
							</svg>
						</div>
						<div className="swap-on">
							<svg
								className="fill-current"
								xmlns="http://www.w3.org/2000/svg"
								width="32"
								height="32"
								viewBox="0 0 512 512"
								onClick={() => store?.toggle()}
							>
								<polygon points="400 145.49 366.51 112 256 222.51 145.49 112 112 145.49 222.51 256 112 366.51 145.49 400 256 289.49 366.51 400 400 366.51 289.49 256 400 145.49" />
							</svg>
						</div>
					</label>
				</div>
				<div className="ml-auto flex">
					<ThemeSwitch />
					<span className="ml-2 flex flex-col justify-center">
						<span className="truncate font-semibold leading-none tracking-wide">
							{session?.user?.name}
						</span>
						<span className="mt-1 w-20 truncate text-xs leading-none text-gray-500">
							{session?.user?.role}
						</span>
					</span>
				</div>
			</div>
		</header>
	);
};

export default Header;
