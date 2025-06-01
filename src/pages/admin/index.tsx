import type { ReactElement } from "react";
import { useRouter } from "next/router";
import { LayoutAdminAuthenticated } from "~/components/layouts/layout";
import Users from "./users";
import Controller from "./controller";
import Mail from "./mail";
import Notification from "./notification";
import { useTranslations } from "next-intl";
import Organization from "./organization";
import Settings from "./settings";
import { getServerSideProps } from "~/server/getServerSideProps";
import useOrganizationWebsocket from "~/hooks/useOrganizationWebsocket";
import MetaTags from "~/components/shared/metaTags";
import Link from "next/link";
import { api } from "~/utils/api";
import BackupRestore from "./backuprestore";

const AdminSettings = ({ orgIds }) => {
	const { data: globalOptions } = api.settings.getAllOptions.useQuery();
	const title = `${globalOptions?.siteName} - Admin Settings`;

	const router = useRouter();
	const { tab = "members" } = router.query;
	const t = useTranslations("sidebar");

	useOrganizationWebsocket(orgIds);
	interface ITab {
		name: string;
		value: string;
		component: ReactElement;
	}

	const tabs: ITab[] = [
		{
			name: t("settings"),
			value: "site-setting",
			component: <Settings />,
		},
		{
			name: t("mail"),
			value: "mail-setting",
			component: <Mail />,
		},
		{
			name: t("users"),
			value: "users",
			component: <Users />,
		},
		{
			name: t("notification"),
			value: "notification",
			component: <Notification />,
		},
		{
			name: t("controller"),
			value: "controller",
			component: <Controller />,
		},
		{
			name: t("organization"),
			value: "organization",
			component: <Organization />,
		},
		{
			name: t("backuprestore"),
			value: "backup-restore",
			component: <BackupRestore />,
		},
	];

	return (
		<div className="animate-fade-in py-5 sm:w-11/12 mx-auto">
			<MetaTags title={title} />
			<div role="tablist" className="tabs tabs-bordered flex flex-wrap p-3 pb-10 ">
				{tabs.map((t) => (
					<Link
						key={t.value}
						href={`/admin?tab=${t.value}`}
						role="tab"
						className={`text-md uppercase tab ${
							t.value === tab ? "tab-active" : "text-gray-600"
						}`}
					>
						{t.name}
					</Link>
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
