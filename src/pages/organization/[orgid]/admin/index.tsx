import React, { type ReactElement } from "react";
import { useRouter } from "next/router";
import { LayoutOrganizationAuthenticated } from "~/components/layouts/layout";
import { globalSiteTitle } from "~/utils/global";
import { useTranslations } from "next-intl";
import { getServerSideProps } from "~/server/getServerSideProps";
import useOrganizationWebsocket from "~/hooks/useOrganizationWebsocket";
import MetaTags from "~/components/shared/metaTags";
import OrganizationSettings from "./organization-setting";
import OrganizationWebhook from "./webhooks";
import OrganizationNetworkSetting from "./network";
import OrganizationInvites from "./invite";

const OrganizationAdminSettings = ({ orgIds }) => {
	const title = `${globalSiteTitle} - Admin Settings`;

	const router = useRouter();
	const { tab = "members", orgid: organizationId } = router.query;
	const t = useTranslations("commonMenuTabs");

	useOrganizationWebsocket(orgIds);
	interface ITab {
		name: string;
		value: string;
		component: ReactElement;
	}

	const tabs: ITab[] = [
		{
			name: t("settings"),
			value: "organization-setting",
			component: <OrganizationSettings />,
		},
		{
			name: t("invites"),
			value: "organization-invites",
			component: <OrganizationInvites />,
		},
		{
			name: t("network"),
			value: "network-setting",
			component: <OrganizationNetworkSetting />,
		},
		{
			name: t("webhooks"),
			value: "webhook-setting",
			component: <OrganizationWebhook />,
		},
	];

	const changeTab = async (tab: ITab) => {
		await router.push({
			pathname: `/organization/${organizationId}/admin`,
			query: { tab: tab.value },
		});
	};
	return (
		<div className="animate-fadeIn py-5">
			<MetaTags title={title} />
			<div role="tablist" className="tabs tabs-bordered flex flex-wrap p-3 pb-10 ">
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

OrganizationAdminSettings.getLayout = function getLayout(page: ReactElement) {
	return (
		<LayoutOrganizationAuthenticated props={page?.props}>
			{page}
		</LayoutOrganizationAuthenticated>
	);
};
export { getServerSideProps };
export default OrganizationAdminSettings;
