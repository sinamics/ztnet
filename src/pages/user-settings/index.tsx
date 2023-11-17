import React, { type ReactElement } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import Account from "./account";
import { type GetServerSidePropsContext } from "next";
import { useTranslations } from "next-intl";
import UserNetworkSetting from "./network";
import { globalSiteTitle } from "~/utils/global";

const UserSettings = () => {
	const title = `${globalSiteTitle} - User Settings`;
	const router = useRouter();
	const t = useTranslations("userSettings");
	const { tab = "members" } = router.query;
	//   const { t } = useTranslation();
	interface ITab {
		name: string;
		value: string;
		component: ReactElement;
	}

	const tabs: ITab[] = [
		{
			name: t("tabs.account"),
			value: "account",
			component: <Account />,
		},
		{
			name: t("tabs.network"),
			value: "network",
			component: <UserNetworkSetting />,
		},
	];

	const changeTab = async (tab: ITab) => {
		await router.push({
			pathname: "/user-settings",
			query: { tab: tab.value },
		});
	};
	return (
		<>
			<Head>
				<title>{title}</title>
				<link rel="icon" href="/favicon.ico" />
				<meta property="og:title" content={title} key={title} />
				<meta name="robots" content="nofollow" />
			</Head>
			<div className="py-5">
				<div className="tabs mx-auto w-full p-3 pb-10 sm:w-6/12">
					{tabs.map((t) => (
						<a
							key={t.value}
							onClick={() => void changeTab(t)}
							className={`text-md tab tab-bordered ${
								t.value === tab ? "tab-active" : ""
							}`}
						>
							{t.name}
						</a>
					))}
				</div>
				{tabs.find((t) => t.value === tab)?.component}
			</div>
		</>
	);
};

UserSettings.getLayout = function getLayout(page: ReactElement) {
	return <LayoutAuthenticated>{page}</LayoutAuthenticated>;
};

export async function getServerSideProps(context: GetServerSidePropsContext) {
	return {
		props: {
			// You can get the messages from anywhere you like. The recommended
			// pattern is to put them in JSON files separated by locale and read
			// the desired one based on the `locale` received from Next.js.
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			messages: (await import(`../../locales/${context.locale}/common.json`)).default,
		},
	};
}
export default UserSettings;
