import { useTranslations } from "next-intl";
import React, { useState } from "react";
import DeleteOrganizationModal from "~/components/adminPage/organization/deleteOrganizationModal";
import OrganizationInviteModal from "~/components/adminPage/organization/organizationInviteModal";
import EditOrganizationModal from "~/components/organization/editOrgModal";
import { OrganizationUserTable } from "~/components/organization/userTable";
import { api } from "~/utils/api";
import { useModalStore } from "~/utils/store";

const ListOrganizations = () => {
	const t = useTranslations("admin");
	const b = useTranslations("commonButtons");
	const [openOrgId, setOpenOrgId] = useState(null);
	const { data: userOrgs } = api.org.getAllOrg.useQuery();
	const { callModal } = useModalStore((state) => state);

	const toggleUsersTable = (orgId) => {
		if (openOrgId === orgId) {
			// If the table for this org is already open, close it
			setOpenOrgId(null);
		} else {
			// Open the table for the clicked org
			setOpenOrgId(orgId);
		}
	};
	return (
		<div className="space-y-10">
			{userOrgs?.map((org) => (
				<div key={org.id} className="border border-primary p-4 my-4 rounded">
					<p>
						<strong>{t("organization.listOrganization.organizationName")}</strong>{" "}
						{org.orgName}
					</p>
					<p>
						<strong>{t("organization.listOrganization.description")}</strong>{" "}
						{org.description}
					</p>
					<p>
						<strong>{t("organization.listOrganization.numberOfMembers")}</strong>{" "}
						{org?.users?.length}
					</p>
					<p className="pt-3">
						{org?.invitations?.length > 0 ? (
							<div>
								<strong>{t("organization.listOrganization.pendingInvitations")}</strong>
								<div className="flex gap-3">
									{org?.invitations?.map((invite) => (
										<button
											onClick={() =>
												callModal({
													title: (
														<p>
															<span>
																{t("organization.listOrganization.invitationModal.title")}
															</span>
														</p>
													),
													content: <OrganizationInviteModal organizationId={org.id} />,
												})
											}
											className="badge badge-primary cursor-pointer"
											key={invite.id}
										>
											{invite.email}
										</button>
									))}
								</div>
							</div>
						) : null}
					</p>
					<div className="p-3 pt-2 flex justify-between">
						<div className="space-x-2">
							<button
								onClick={() =>
									callModal({
										rootStyle: "h-3/6",
										title: (
											<p>
												<span>
													{t("organization.listOrganization.invitationModal.title")}
												</span>
											</p>
										),
										content: <OrganizationInviteModal organizationId={org.id} />,
									})
								}
								className="btn btn-sm"
							>
								{b("inviteUser")}
							</button>
							<button
								onClick={() => {
									callModal({
										title: (
											<p>
												<span>Edit Meta </span>
												<span className="text-primary">{org.orgName}</span>
											</p>
										),
										content: <EditOrganizationModal organizationId={org.id} />,
									});
								}}
								className="btn btn-sm"
							>
								{b("meta")}
							</button>
							<button onClick={() => toggleUsersTable(org.id)} className="btn btn-sm">
								{b("users")}
							</button>
						</div>
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
					{openOrgId === org.id ? (
						<OrganizationUserTable organizationId={org.id} />
					) : null}
				</div>
			))}
		</div>
	);
};

export default ListOrganizations;
