import React, { type ReactElement } from "react";
import { useRouter } from "next/router";
import { LayoutOrganizationAuthenticated } from "~/components/layouts/layout";
import { useTranslations } from "next-intl";
import { getServerSideProps } from "~/server/getServerSideProps";
import useOrganizationWebsocket from "~/hooks/useOrganizationWebsocket";
import MetaTags from "~/components/shared/metaTags";
import OrganizationSettings from "./settings";
import OrganizationWebhook from "./webhooks";
import OrganizationNetworkSetting from "./network";
import OrganizationInvites from "./invite";
import OrganizationNotification from "./notification";
import { api } from "~/utils/api";

const OrganizationAdminSettings = ({ orgIds, user }) => {
	const { data: globalOptions } = api.settings.getAllOptions.useQuery();
	const title = `${globalOptions?.siteName} - Admin Settings`;

	const router = useRouter();
	const { tab = "members", orgid: organizationId } = router.query;
	const t = useTranslations("commonMenuTabs");

	useOrganizationWebsocket(orgIds);
	interface ITab {
		userRole: string;
		name: string;
		value: string;
		component: ReactElement;
	}

	const tabs: ITab[] = [
		{
			userRole: "USER",
			name: t("settings"),
			value: "organization-settings",
			component: <OrganizationSettings user={user} />,
		},
		{
			userRole: "ADMIN",
			name: t("invites"),
			value: "organization-invites",
			component: <OrganizationInvites />,
		},
		{
			userRole: "ADMIN",
			name: t("network"),
			value: "organization-network-settings",
			component: <OrganizationNetworkSetting />,
		},
		{
			userRole: "ADMIN",
			name: t("notification"),
			value: "organization-notification-settings",
			component: <OrganizationNotification />,
		},
		{
			userRole: "ADMIN",
			name: t("webhooks"),
			value: "organization-webhook-settings",
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
				{tabs.map((t) => {
					if (user.role === "USER" && t.userRole === "ADMIN") {
						return null;
					}
					return (
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
					);
				})}
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
