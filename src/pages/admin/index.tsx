import React, { type ReactElement } from "react";
import { useRouter } from "next/router";
import { LayoutAdminAuthenticated } from "~/components/layouts/layout";
import Users from "./users";
import Controller from "./controller";
import { globalSiteTitle } from "~/utils/global";
import Mail from "./mail";
import Notification from "./notification";
import { useTranslations } from "next-intl";
import Organization from "./organization";
import Settings from "./settings";
import { getServerSideProps } from "~/server/getServerSideProps";
import useOrganizationWebsocket from "~/hooks/useOrganizationWebsocket";
import MetaTags from "~/components/shared/metaTags";

const AdminSettings = ({ orgIds }) => {
	const title = `${globalSiteTitle} - Admin Settings`;

	const router = useRouter();
	const { tab = "members" } = router.query;
	const t = useTranslations("admin");

	useOrganizationWebsocket(orgIds);
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
		<div className="animate-fadeIn py-5">
			<MetaTags title={title} />
			<div
				role="tablist"
				className="tabs tabs-bordered flex mx-auto p-3 pb-10 sm:w-6/12 "
			>
				{tabs.map((t) => (
					<a
						key={t.value}
						role="tab"
						onClick={() => void changeTab(t)}
						className={`text-md uppercase tab ${
							t.value === tab ? "tab-active" : "text-gray-600"
						}`}
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
