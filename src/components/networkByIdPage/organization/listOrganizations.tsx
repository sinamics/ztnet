import { useTranslations } from "next-intl";
import React from "react";
import DeleteOrganizationModal from "~/components/organization/deleteOrganizationModal";
// import EditOrganizationModal from "~/components/organization/editOrgModal";
// import { OrganizationUserTable } from "~/components/organization/userTable";
import { api } from "~/utils/api";
import { useModalStore } from "~/utils/store";

const ListOrganizations = () => {
	const t = useTranslations();
	const b = useTranslations("commonButtons");
	const { data: userOrgs } = api.org.getAllOrg.useQuery();
	const { callModal } = useModalStore((state) => state);

	return (
		<div className="space-y-10">
			{userOrgs?.map((org) => (
				<div
					key={org.id}
					className="border border-primary/20 p-4 my-4 rounded bg-base-200 shadow-lg"
				>
					<div>
						<p>
							<strong>{t("admin.organization.listOrganization.organizationName")}</strong>{" "}
							{org.orgName}
						</p>
						<p>
							<strong>{t("admin.organization.listOrganization.numberOfMembers")}</strong>{" "}
							{org?.users?.length}
						</p>
						<p>
							<strong>{t("admin.organization.listOrganization.description")}</strong>{" "}
							{org.description}
						</p>
					</div>
					<div>
						<div className="flex justify-end">
							<button
								onClick={() =>
									callModal({
										title: (
											<p>
												<span>{b("deleteOrganization")} </span>
												<span className="text-primary">{org.orgName}</span>
											</p>
										),
										content: <DeleteOrganizationModal org={org} />,
									})
								}
								className="btn btn-sm btn-error btn-outline"
							>
								{b("deleteOrganization")}
							</button>
						</div>
					</div>
					{/* {openOrgId === org.id ? (
						<OrganizationUserTable organizationId={org.id} />
					) : null} */}
				</div>
			))}
		</div>
	);
};

export default ListOrganizations;
