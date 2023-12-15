import React, { useEffect, type ReactElement } from "react";
import { useRouter } from "next/router";
import { LayoutAdminAuthenticated } from "~/components/layouts/layout";
import Users from "./users";
import Controller from "./controller";
import { globalSiteTitle } from "~/utils/global";
import Mail from "./mail";
import Notification from "./notification";
import { useTranslations } from "next-intl";
import Organization from "./organization";
import Head from "next/head";
import Settings from "./settings";
import { getServerSideProps } from "~/server/getServerSideProps";
import { useSocketStore } from "~/utils/store";

const AdminSettings = ({ orgIds }) => {
	const title = `${globalSiteTitle} - Admin Settings`;

	const router = useRouter();
	const { tab = "members" } = router.query;
	const t = useTranslations("admin");

	const setupSocket = useSocketStore((state) => state.setupSocket);
	const cleanupSocket = useSocketStore((state) => state.cleanupSocket);

	useEffect(() => {
		if (orgIds) {
			setupSocket(orgIds);
		}
		return () => {
			cleanupSocket();
		};
	}, [orgIds, setupSocket, cleanupSocket]);

	interface ITab {
		name: string;
		value: string;
		component: ReactElement;
	}

	const tabs: ITab[] = [
		{
			name: t("tabs.settings"),
			value: "site-setting",
			component: <Settings />,
		},
		{
			name: t("tabs.mail"),
			value: "mail-setting",
			component: <Mail />,
		},
		{
			name: t("tabs.users"),
			value: "users",
			component: <Users />,
		},
		{
			name: t("tabs.notification"),
			value: "notification",
			component: <Notification />,
		},
		{
			name: t("tabs.controller"),
			value: "controller",
			component: <Controller />,
		},
		{
			name: t("tabs.organization"),
			value: "organization",
			component: <Organization />,
		},
	];

	const changeTab = async (tab: ITab) => {
		await router.push({
			pathname: "/admin",
			query: { tab: tab.value },
		});
	};
	return (
		<div className="py-5">
			<Head>
				<title>{title}</title>
				<link rel="icon" href="/favicon.ico" />
				<meta property="og:title" content={title} key={title} />
				<meta name="robots" content="noindex, nofollow" />
			</Head>
			<div className="tabs mx-auto w-full p-3 pb-10 sm:w-6/12">
				{tabs.map((t) => (
					<a
						key={t.value}
						onClick={() => void changeTab(t)}
						className={`text-md tab tab-bordered ${t.value === tab ? "tab-active" : ""}`}
					>
						{t.name}
					</a>
				))}
			</div>
			{tabs.find((t) => t.value === tab)?.component}
		</div>
	);
};

AdminSettings.getLayout = function getLayout(page: ReactElement) {
	return <LayoutAdminAuthenticated props={page?.props}>{page}</LayoutAdminAuthenticated>;
};
export { getServerSideProps };
export default AdminSettings;
