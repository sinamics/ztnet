import React from "react";
import { api } from "~/utils/api";

const ListOrganizations = () => {
	const { data: userOrgs } = api.org.getAllOrg.useQuery();
	const { mutate: addUser } = api.org.addUser.useMutation();

	// const { data: users } = api.admin.getUsers.useQuery({
	// 	isAdmin: false,
	// });
	// console.log(userOrgs);
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
				</div>
			))}
		</div>
	);
};

export default ListOrganizations;
