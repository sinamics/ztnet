import { User } from "@prisma/client";
// import { useTranslations } from "next-intl";
import React from "react";
import toast from "react-hot-toast";
import { ErrorData } from "~/types/errorHandling";
import { api } from "~/utils/api";
// import { useModalStore } from "~/utils/store";

interface Iuser {
	user: Partial<User>;
}
const UserRole = ({ user }: Iuser) => {
	// const t = useTranslations("admin");
	// const { callModal } = useModalStore((state) => state);
	const { data: usergroups } = api.admin.getUserGroups.useQuery();
	const { mutate: assignUserGroup } = api.admin.assignUserGroup.useMutation({
		onError: (error) => {
			if ((error.data as ErrorData)?.zodError) {
				const fieldErrors = (error.data as ErrorData)?.zodError.fieldErrors;
				for (const field in fieldErrors) {
					toast.error(`${fieldErrors[field].join(", ")}`);
				}
			} else if (error.message) {
				toast.error(error.message);
			} else {
				toast.error("An unknown error occurred");
			}
		},
		onSuccess: () => {
			toast.success("Group added successfully");
		},
	});
	if (Array.isArray(usergroups) && usergroups.length === 0) {
		return "None";
	}
	return (
		<div className="form-control w-full max-w-xs">
			<select
				defaultValue={user?.userGroupId ?? "none"}
				onChange={(e) => {
					assignUserGroup({
						userid: user.id,
						userGroupId: e.target.value,
					});
				}}
				className="select select-sm select-ghost max-w-xs"
			>
				<option value="none">None</option>
				{usergroups.map((group) => {
					return (
						<option key={group.id} value={group.id}>
							{group.name}
						</option>
					);
				})}
			</select>
		</div>
	);
};

export default UserRole;
