import React from "react";
import { api } from "~/utils/api";

const OrgUsers = () => {
	const { data: userOrgs } = api.org.getAllOrg.useQuery();
	const { mutate: addUser } = api.org.addUser.useMutation();

	// const { data: users } = api.admin.getUsers.useQuery({
	// 	isAdmin: false,
	// });
	// console.log(userOrgs);
	return (
		<div className="space-y-10">
			<div className="pb-5">
				<p className="text-sm text-gray-500">
					Colaborate with other users within your organization
				</p>
			</div>
			{userOrgs?.map((org) => (
				<div key={org.id} className="flex justify-between">
					<p>{org.orgName}</p>
					<p>{org.description}</p>
					{org?.users?.map((user) => (
						<p>{user.name}</p>
					))}
				</div>
			))}
			<p>Add user</p>
			<button
				onClick={() =>
					addUser({
						orgId: "clpch2dth0002o01ar0w5b4ag",
						userId: "clpcoj06q0000o07wnzrumfel",
					})
				}
			>
				Add Petter
			</button>
		</div>
	);
};

export default OrgUsers;
