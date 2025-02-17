"use client";
import React, { type ReactElement } from "react";
import Head from "next/head";
import { useRouter, useSearchParams } from "next/navigation";
import Account from "./account";
import { useTranslations } from "next-intl";
import UserNetworkSetting from "./network";
import UserSettingsNotification from "./notification";
import { api } from "~/utils/api";

const UserSettings = () => {
	const { data: globalOptions } = api.settings.getAllOptions.useQuery();
	const title = `${globalOptions?.siteName} - User Settings`;

	const t = useTranslations("userSettings");
	const router = useRouter();
	const search = useSearchParams();
	const tab = search.get("tab") || "account";

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
		router.push(`/user-settings?tab=${tab.value}`);
	};
	return (
		<div className="animate-fadeIn">
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

export default UserSettings;
