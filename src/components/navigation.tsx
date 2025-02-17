// import { useTranslations } from "next-intl";
import LocaleSwitcher from "./localeSwitcher";
import NavigationLink from "./navigationLink";

export default function Navigation() {
	// const t = useTranslations("Navigation");

	return (
		<div className="bg-slate-850">
			<nav className="container flex justify-between p-2 text-white">
				<div>
					<NavigationLink href="/">Home</NavigationLink>
					<NavigationLink href="/pathnames">PathNames</NavigationLink>
				</div>
				<LocaleSwitcher />
			</nav>
		</div>
	);
}
