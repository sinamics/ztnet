import { useTranslations } from "next-intl";
import React, { useState } from "react";
import ApiTokenModal from "~/components/adminPage/organization/apiTokenModal";
import DeleteOrganizationModal from "~/components/adminPage/organization/deleteOrganizationModal";
import OrganizationInviteModal from "~/components/adminPage/organization/organizationInviteModal";
import EditOrganizationModal from "~/components/organization/editOrgModal";
import { OrganizationUserTable } from "~/components/organization/userTable";
import OrganizationWebhook from "~/components/organization/webhookModal";
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
				<div
					key={org.id}
					className="border border-primary/20 p-4 my-4 rounded bg-base-200 shadow-lg"
				>
					<div>
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
						<p>
							<strong>Rest API:</strong>{" "}
							{org?.APIToken ? (
								<span className="text-success">
									Active, {org?.APIToken.length} Tokens
								</span>
							) : (
								<span className="text-error">Inactive</span>
							)}
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
																	{t(
																		"organization.listOrganization.invitationModal.title",
																	)}
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
					</div>
					<div className="py-5">
						{org?.webhooks?.length > 0 ? (
							<div className="flex items-center gap-4">
								<strong>{t("organization.listOrganization.activeWebhooks")}</strong>
								<div className="flex gap-3">
									{org?.webhooks?.map((hook) => (
										<button
											onClick={() =>
												callModal({
													rootStyle: "h-4/6",
													title: (
														<p>
															<span>
																{t(
																	"organization.listOrganization.webhookModal.editWebhookTitle",
																)}
															</span>
														</p>
													),
													content: (
														<OrganizationWebhook organizationId={org.id} hook={hook} />
													),
												})
											}
											className="badge badge-primary cursor-pointer"
											key={hook.id}
										>
											{hook.name}
										</button>
									))}
								</div>
							</div>
						) : null}
					</div>
					<div>
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
									className="btn btn-sm bg-base-300"
								>
									{b("inviteUser")}
								</button>
								<button
									onClick={() =>
										callModal({
											rootStyle: "h-3/6",
											title: (
												<p>
													<span>Create Organization API Token</span>
												</p>
											),
											content: <ApiTokenModal organizationId={org.id} orgData={org} />,
										})
									}
									className="btn btn-sm bg-base-300"
								>
									API TOKEN
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
									className="btn btn-sm bg-base-300"
								>
									{b("meta")}
								</button>
								<button
									onClick={() => {
										callModal({
											rootStyle: "h-4/6",
											title: (
												<p>
													<span>
														{t.rich(
															"organization.listOrganization.webhookModal.createWebhookTitle",
															{
																span: (children) => (
																	<span className="text-primary">{children}</span>
																),
																organization: org.orgName,
															},
														)}
													</span>
												</p>
											),
											content: <OrganizationWebhook organizationId={org.id} />,
										});
									}}
									className="btn btn-sm bg-base-300"
								>
									{b("addWebhooks")}
								</button>
								<button
									onClick={() => toggleUsersTable(org.id)}
									className="btn btn-sm bg-base-300"
								>
									{b("users")}
								</button>
							</div>
						</div>
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
					{openOrgId === org.id ? (
						<OrganizationUserTable organizationId={org.id} />
					) : null}
				</div>
			))}
		</div>
	);
};

export default ListOrganizations;
