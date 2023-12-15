import React, { useEffect, type ReactElement } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import Account from "./account";
import { useTranslations } from "next-intl";
import UserNetworkSetting from "./network";
import { globalSiteTitle } from "~/utils/global";
import { getServerSideProps } from "~/server/getServerSideProps";
import { useSocketStore } from "~/utils/store";

type OrganizationId = {
	id: string;
};
interface IProps {
	orgIds: OrganizationId[];
}

const UserSettings = ({ orgIds }: IProps) => {
	const title = `${globalSiteTitle} - User Settings`;
	const router = useRouter();
	const t = useTranslations("userSettings");
	const { tab = "members" } = router.query;

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
				<meta name="robots" content="noindex, nofollow" />
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

export { getServerSideProps };
export default UserSettings;
