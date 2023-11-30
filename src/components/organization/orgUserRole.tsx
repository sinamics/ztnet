import { User } from "@prisma/client";
import { useTranslations } from "next-intl";
import React from "react";
import toast from "react-hot-toast";
import { ErrorData } from "~/types/errorHandling";
import { api } from "~/utils/api";

interface Iuser {
	user: Partial<User>;
	organizationId: string;
}
const OrgUserRole = ({ user, organizationId }: Iuser) => {
	const t = useTranslations("admin");

	const { refetch: refecthOrg } = api.org.getOrgUsers.useQuery({
		organizationId,
	});

	const { data: orgUserRole, refetch: refetchUserRole } =
		api.org.getOrgUserRoleById.useQuery({
			organizationId,
			userId: user?.id,
		});

	const { mutate: changeRole } = api.org.changeUserRole.useMutation({
		onSuccess: () => {
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

	const dropDownHandler = (e: React.ChangeEvent<HTMLSelectElement>, userId: string) => {
		let description = "";

		if (e.target.value === "ADMIN") {
			description = t("users.users.roleDescriptions.admin");
		} else if (e.target.value === "USER") {
			description = t("users.users.roleDescriptions.user");
		}

		changeRole(
			{
				userId,
				role: e.target.value,
				organizationId,
			},
			{
				onSuccess: () => {
					refecthOrg();
					refetchUserRole();
				},
			},
		);
	};

	return (
		<div className="form-control w-full max-w-xs">
			<select
				value={orgUserRole?.role as string}
				onChange={(e) => dropDownHandler(e, user?.id)}
				className="select select-sm select-bordered  select-ghost max-w-xs"
			>
				<option>USER</option>
				<option>READ_ONLY</option>
			</select>
		</div>
	);
};

export default OrgUserRole;
