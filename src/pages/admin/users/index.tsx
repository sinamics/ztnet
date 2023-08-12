import { type ReactElement } from "react";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import { Accounts } from "~/components/modules/accountTable";
import UserGroups from "~/components/modules/userGroups";

const Users = () => {
	return (
		<main className="mx-auto flex-col w-full bg-base-100 p-3 sm:w-6/12">
			<div>
				<p className="text-sm text-gray-400">Groups</p>
				<div className="divider mt-0 text-gray-500"></div>
			</div>
			<div className="pb-5">
				<p className="text-sm text-gray-500">
					Here you can create a new user group to categorize and manage your
					platform users more effectively. Assigning users to specific groups
					can help streamline access rights, set specific limits, and apply
					unique settings tailored for different sets of users.
				</p>
			</div>
			<div className="space-y-5 ">
				<div className="w-full">
					<UserGroups />
				</div>
			</div>

			<div className="py-10">
				<Accounts />
			</div>
		</main>
	);
};
Users.getLayout = function getLayout(page: ReactElement) {
	return <LayoutAuthenticated>{page}</LayoutAuthenticated>;
};

export default Users;
