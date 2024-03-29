import { User } from "@prisma/client";
import { useTranslations } from "next-intl";
import React from "react";
import {
	useTrpcApiErrorHandler,
	useTrpcApiSuccessHandler,
} from "~/hooks/useTrpcApiHandler";
import { api } from "~/utils/api";

interface Iuser {
	user: Partial<User>;
}
const UserRole = ({ user }: Iuser) => {
	const t = useTranslations("admin");

	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();

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
		onSuccess: handleApiSuccess({
			refetch: [refetchUsers, refetchUser],
			toastMessage: t("users.users.toastMessages.roleChangeSuccess"),
		}),
		onError: handleApiError,
	});
	const dropDownHandler = (e: React.ChangeEvent<HTMLSelectElement>, id: string) => {
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
