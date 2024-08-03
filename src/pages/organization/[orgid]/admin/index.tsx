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

const OrganizationAdminSettings = ({ orgIds }) => {
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
			name: "Settings",
			value: "organization-setting",
			component: <OrganizationSettings />,
		},
		{
			name: "Webhooks",
			value: "webhook-setting",
			component: <OrganizationWebhook />,
		},
	];

	const changeTab = async (tab: ITab) => {
		await router.push({
			pathname: "/admin/organization-setting",
			query: { tab: tab.value },
		});
	};
	return (
		<div className="animate-fadeIn py-5 sm:w-11/12 mx-auto">
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
