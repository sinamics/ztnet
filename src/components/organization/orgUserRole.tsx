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
	organizationId: string;
}
const OrgUserRole = ({ user, organizationId }: Iuser) => {
	const t = useTranslations("admin");

	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();

	const { refetch: refecthOrg } = api.org.getOrgUsers.useQuery({
		organizationId,
	});

	const { data: orgUserRole, refetch: refetchUserRole } =
		api.org.getOrgUserRoleById.useQuery({
			organizationId,
			userId: user?.id,
		});

	const { mutate: changeRole } = api.org.changeUserRole.useMutation({
		onSuccess: handleApiSuccess({
			actions: [refecthOrg, refetchUserRole],
			toastMessage: t("users.users.toastMessages.roleChangeSuccess"),
		}),
		onError: handleApiError,
	});

	const dropDownHandler = (e: React.ChangeEvent<HTMLSelectElement>, userId: string) => {
		changeRole({
			userId,
			role: e.target.value,
			organizationId,
		});
	};

	return (
		<div className="form-control w-full max-w-xs">
			<select
				value={orgUserRole?.role as string}
				onChange={(e) => dropDownHandler(e, user?.id)}
				className="select select-sm select-bordered  select-ghost max-w-xs"
			>
				<option>ADMIN</option>
				<option>USER</option>
				<option>READ_ONLY</option>
			</select>
		</div>
	);
};

export default OrgUserRole;
