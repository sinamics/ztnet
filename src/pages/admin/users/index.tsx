import { type ReactElement } from "react";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import { Accounts } from "~/components/modules/accountTable";
import InputFields from "~/components/elements/inputField";

const Users = () => {
	return (
		<main className="mx-auto flex w-full flex-col justify-center bg-base-100 p-3 sm:w-6/12">
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
			<div className="space-y-5">
				<div className="flex items-center justify-between">
					<InputFields
						isLoading={false}
						label="Groups"
						rootFormClassName="flex flex-col space-y-2"
						size="sm"
						buttonText="Add Group"
						fields={[
							{
								name: "name",
								type: "text",
								placeholder: "Group Name",
								defaultValue: "",
							},
							{
								name: "Max Networks",
								type: "number",
								placeholder: "Max Network",
								defaultValue: "",
							},
							{
								name: "permission",
								elementType: "select",
								placeholder: "User Permission",
								defaultValue: "Write",
								selectOptions: [
									{ value: "write", label: "WRITE" },
									{ value: "read", label: "READ" },
								],
							},
						]}
						// submitHandler={async (params) => await inputHandler(params)}
					/>
				</div>
			</div>

			<div className="p-10">
				<Accounts />
			</div>
		</main>
	);
};
Users.getLayout = function getLayout(page: ReactElement) {
	return <LayoutAuthenticated>{page}</LayoutAuthenticated>;
};

export default Users;
