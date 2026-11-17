import type { ReactElement } from "react";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import { useTranslations } from "next-intl";
import AddOrgForm from "~/components/networkByIdPage/organization/addOrgForm";
import ListOrganizations from "~/components/networkByIdPage/organization/listOrganizations";
import OrganizationQuotas from "~/components/adminPage/organization/organizationQuotas";
import MenuSectionDividerWrapper from "~/components/shared/menuSectionDividerWrapper";

const Organization = () => {
	const t = useTranslations("admin");

	return (
		<main className="flex w-full flex-col space-y-5 bg-base-100 p-5 sm:p-3 xl:w-6/12">
			<MenuSectionDividerWrapper
				title={t("organization.addOrganization.title")}
				className="space-y-1"
			>
				<div className="pb-5">
					<p className="text-sm text-gray-500">
						{t("organization.addOrganization.description")}
					</p>
				</div>
				<div className="py-5">
					<AddOrgForm />
				</div>
				<ListOrganizations />
			</MenuSectionDividerWrapper>
			<MenuSectionDividerWrapper title={t("organization.quotas.title")}>
				<OrganizationQuotas />
			</MenuSectionDividerWrapper>
		</main>
	);
};

Organization.getLayout = function getLayout(page: ReactElement) {
	return <LayoutAuthenticated>{page}</LayoutAuthenticated>;
};
export default Organization;
