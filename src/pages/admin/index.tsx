import React, { type ReactElement } from "react";
import { useRouter } from "next/router";
import { LayoutAdminAuthenticated } from "~/components/layouts/layout";
import Users from "./users";
import Controller from "./controller";
import { globalSiteTitle } from "~/utils/global";
import Mail from "./mail";
import Notification from "./notification";
import { useTranslations } from "next-intl";
import { GetServerSidePropsContext } from "next";
import { withAuth } from "~/components/auth/withAuth";
import Head from "next/head";
import Settings from "./settings";

const AdminSettings = () => {
	const title = `${globalSiteTitle} - Admin Settings`;

	const router = useRouter();
	const { tab = "members" } = router.query;
	const t = useTranslations("admin");
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
				<meta name="robots" content="nofollow" />
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
export const getServerSideProps = withAuth(async (context: GetServerSidePropsContext) => {
	return {
		props: {
			// You can get the messages from anywhere you like. The recommended
			// pattern is to put them in JSON files separated by locale and read
			// the desired one based on the `locale` received from Next.js.
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			messages: (await import(`../../locales/${context.locale}/common.json`)).default,
		},
	};
});
export default AdminSettings;
