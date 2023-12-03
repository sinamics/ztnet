import { type ReactElement } from "react";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import { useTranslations } from "next-intl";
import AddOrgForm from "~/components/networkByIdPage/organization/addOrgForm";
import ListOrganizations from "~/components/networkByIdPage/organization/listOrganizations";

const Organization = () => {
	const t = useTranslations("admin");

	return (
		<main className="mx-auto flex w-full flex-col space-y-5 bg-base-100 p-3 sm:w-6/12">
			<div className="pb-10 w-full">
				<p className="text-sm text-gray-400">{t("organization.addOrganization.title")}</p>
				<div className="divider m-0 p-0 text-gray-500"></div>
				<div className="pb-5">
					<p className="text-sm text-gray-500">
					{t("organization.addOrganization.description")}
					</p>
				</div>
				<div className="py-5">
					<AddOrgForm />
				</div>
				<ListOrganizations />
			</div>
		</main>
	);
};

Organization.getLayout = function getLayout(page: ReactElement) {
	return <LayoutAuthenticated>{page}</LayoutAuthenticated>;
};
export default Organization;
