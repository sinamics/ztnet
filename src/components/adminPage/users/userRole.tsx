import { User } from "@prisma/client";
import { useTranslations } from "next-intl";
import React from "react";
import toast from "react-hot-toast";
import { ErrorData } from "~/types/errorHandling";
import { api } from "~/utils/api";
// import { useModalStore } from "~/utils/store";

interface Iuser {
	user: Partial<User>;
}
const UserRole = ({ user }: Iuser) => {
	const t = useTranslations("admin");
	// will update the users table as it uses key "getUsers"
	// !TODO should rework to update local cache instead.. but this works for now
	const { refetch: refetchUsers } = api.admin.getUsers.useQuery({
		isAdmin: false,
	});

	// Updates this modal as it uses key "getUser"
	// !TODO should rework to update local cache instead.. but this works for now
	const { refetch: refetchUser } = api.admin.getUser.useQuery({
		userId: user?.id,
	});

	const { mutate: changeRole } = api.admin.changeRole.useMutation({
		onSuccess: () => {
			void refetchUsers();
			void refetchUser();
			toast.success(t("users.users.toastMessages.roleChangeSuccess"));
		},
		onError: (error) => {
			if ((error.data as ErrorData)?.zodError) {
				const fieldErrors = (error.data as ErrorData)?.zodError.fieldErrors;
				for (const field in fieldErrors) {
					toast.error(`${fieldErrors[field].join(", ")}`);
				}
			} else if (error.message) {
				toast.error(error.message);
			} else {
				toast.error(t("users.users.toastMessages.errorOccurred"));
			}
		},
	});
	const dropDownHandler = (e: React.ChangeEvent<HTMLSelectElement>, id: number) => {
		let description = "";

		if (e.target.value === "ADMIN") {
			description = t("users.users.roleDescriptions.admin");
		} else if (e.target.value === "USER") {
			description = t("users.users.roleDescriptions.user");
		}

		changeRole({
			id,
			role: e.target.value,
		});
	};

	return (
		<div className="form-control w-full max-w-xs">
			<select
				value={user?.role as string}
				onChange={(e) => dropDownHandler(e, user?.id)}
				className="select select-sm select-bordered  select-ghost max-w-xs"
			>
				<option>ADMIN</option>
				<option>USER</option>
			</select>
		</div>
	);
};

export default UserRole;
