import React, { type ReactElement } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import Account from "./account";
import { useTranslations } from "next-intl";
import UserNetworkSetting from "./network";
import { getServerSideProps } from "~/server/getServerSideProps";
import UserSettingsNotification from "./notification";
import { api } from "~/utils/api";

const UserSettings = () => {
	const { data: globalOptions } = api.settings.getAllOptions.useQuery();
	const title = `${globalOptions?.siteName} - User Settings`;

	const router = useRouter();
	const t = useTranslations("userSettings");
	const { tab = "members" } = router.query;

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
		{
			name: t("tabs.notification"),
			value: "notification",
			component: <UserSettingsNotification />,
		},
	];

	const changeTab = async (tab: ITab) => {
		await router.push({
			pathname: "/user-settings",
			query: { tab: tab.value },
		});
	};
	return (
		<div className="animate-fade-in">
			<Head>
				<title>{title}</title>
				<link rel="icon" href="/favicon.ico" />
				<meta property="og:title" content={title} key={title} />
				<meta name="robots" content="noindex, nofollow" />
			</Head>
			<div className="py-5 sm:w-11/12 mx-auto">
				<div className="tabs tabs-bordered flex flex-wrap uppercase p-3 pb-10">
					{tabs.map((t) => (
						<a
							key={t.value}
							onClick={() => void changeTab(t)}
							className={`text-md tab tab-bordered ${
								t.value === tab ? "tab-active" : "text-gray-600"
							}`}
						>
							{t.name}
						</a>
					))}
				</div>
				{tabs.find((t) => t.value === tab)?.component}
			</div>
		</div>
	);
};

UserSettings.getLayout = function getLayout(page: ReactElement) {
	return <LayoutAuthenticated>{page}</LayoutAuthenticated>;
};

export { getServerSideProps };
export default UserSettings;
