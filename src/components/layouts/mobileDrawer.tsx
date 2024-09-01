import { useSidebarStore } from "~/utils/store";
import {
	DrawerContent,
	DrawerFooter,
	DrawerClose,
	Drawer,
	DrawerHeader,
	DrawerTitle,
} from "../elements/drawer";
import { MenuIcon } from "~/icons/menu";
import Sidebar from "./sidebar";
import classNames from "classnames";
import { useTranslations } from "next-intl";

const MobileDrawer = () => {
	const t = useTranslations();
	const { open, toggle, setOpenState } = useSidebarStore();
	const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
	return (
		<>
			{isMobile && (
				<div>
					<Drawer open={open} onClose={() => setOpenState(false)}>
						<div className="mx-auto w-full max-w-sm">
							<DrawerContent className="h-5/6 bg-base-200 border-t-2 border-gray-400">
								<DrawerHeader className="border-t-2 mx-auto border-gray-500">
									<DrawerTitle>{t("mobileDrawer.navigation")}</DrawerTitle>
								</DrawerHeader>
								<div className="p-4 h-full overflow-auto">
									<Sidebar
										className={classNames("relative", {
											"w-full overflow-auto": isMobile,
										})}
									/>
								</div>
								<DrawerFooter>
									<DrawerClose asChild>
										<button onClick={() => toggle()} className="btn btn-sm">
											Close
										</button>
									</DrawerClose>
								</DrawerFooter>
							</DrawerContent>
						</div>
					</Drawer>
					<button
						className="btn btn-md fixed bottom-0 left-0 w-full z-50 lg:hidden rounded-none"
						onClick={() => toggle()}
					>
						<MenuIcon /> {t("mobileDrawer.navigation")}
					</button>
				</div>
			)}
		</>
	);
};

export default MobileDrawer;
