import React from "react";
import DeleteOrganizationModal from "~/components/adminPage/organization/deleteOrganizationModal";
import OrganizationInviteModal from "~/components/adminPage/organization/organizationInviteModal";
import { api } from "~/utils/api";
import { useModalStore } from "~/utils/store";

const ListOrganizations = () => {
	const { data: userOrgs } = api.org.getAllOrg.useQuery();
	const { callModal } = useModalStore((state) => state);

	return (
		<div className="space-y-10">
			{userOrgs?.map((org) => (
				<div key={org.id} className="border border-primary p-4 my-4 rounded">
					<p>
						<strong>Organization Name:</strong> {org.orgName}
					</p>
					<p>
						<strong>Description:</strong> {org.description}
					</p>
					<p>
						<strong>Number of members:</strong> {org?.users?.length}
					</p>
					<p className="pt-3">
						{org?.invitations?.length > 0 ? (
							<div>
								<strong>Pending Invitations:</strong>
								<div className="flex gap-3">
									{org?.invitations?.map((invite) => (
										<button
											onClick={() =>
												callModal({
													title: (
														<p>
															<span>Organization Invites</span>
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
					<div className="p-3 pt-10 flex justify-between">
						<div className="space-x-2">
							<button
								onClick={() =>
									callModal({
										rootStyle: "h-3/6",
										title: (
											<p>
												<span>Organization Invites</span>
											</p>
										),
										content: <OrganizationInviteModal organizationId={org.id} />,
									})
								}
								className="btn btn-sm"
							>
								Invite user
							</button>
							<button className="btn btn-sm">Edit Organization</button>
						</div>
						<button
							onClick={() =>
								callModal({
									title: (
										<p>
											<span>Delete Organization </span>
											<span className="text-primary">{org.orgName}</span>
										</p>
									),
									content: <DeleteOrganizationModal org={org} />,
								})
							}
							className="btn btn-sm btn-error btn-outline"
						>
							Delete Organization
						</button>
					</div>
				</div>
			))}
		</div>
	);
};

export default ListOrganizations;
