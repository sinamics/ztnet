import { useTranslations } from "next-intl";
import ScrollableDropdown from "../elements/dropdownlist";
import { api } from "~/utils/api";
import { useState } from "react";
import { Role } from "@prisma/client";
import { useRouter } from "next/router";
import {
	useTrpcApiErrorHandler,
	useTrpcApiSuccessHandler,
} from "~/hooks/useTrpcApiHandler";

type stateType = {
	userId: string;
	name: string;
	role: "ADMIN" | "USER" | "READ_ONLY";
};

const InviteByUsers = () => {
	const t = useTranslations("organization");
	const b = useTranslations("commonButtons");
	const m = useTranslations("commonToast");

	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();

	const router = useRouter();
	const organizationId = router.query.orgid as string;

	const [state, setState] = useState<stateType>({
		userId: null,
		name: "",
		role: Role.READ_ONLY,
	});

	const { mutate: addUser } = api.org.addUser.useMutation({
		onError: handleApiError,
		onSuccess: handleApiSuccess({ toastMessage: m("addedSuccessfully") }),
	});

	const { data: allUsers } = api.org.getPlatformUsers.useQuery({ organizationId });

	const dropDownHandler = (e) => {
		setState({
			...state,
			role: e.target.value,
		});
	};

	return (
		<div className="space-y-5">
			<div className="form-control w-full space-y-5">
				<div>
					<h2 className="font-medium">{t("settings.invitation.inviteSiteUser.title")}</h2>
					<p className="text-sm text-gray-500">
						{t("settings.invitation.inviteSiteUser.description")}
					</p>
				</div>
				<div>
					<p className="text-sm text-gray-500">
						{t("settings.invitation.inviteSiteUser.inputFields.searchUser.title")}
					</p>
					<ScrollableDropdown
						items={allUsers}
						displayField="name"
						inputClassName="w-full"
						idField="id"
						placeholder={t(
							"settings.invitation.inviteSiteUser.inputFields.searchUser.placeholder",
						)}
						onOptionSelect={(selectedItem) => {
							setState({
								...state,
								userId: selectedItem.id,
								name: selectedItem.name,
							});
						}}
					/>
				</div>
			</div>
			<div className="form-control space-y-8">
				<div className="form-control w-full">
					<p className="text-sm text-gray-500">
						{t("settings.invitation.inviteSiteUser.inputFields.userRole.title")}
					</p>
					<select
						value={state?.role}
						onChange={(e) => dropDownHandler(e)}
						className="select select-sm select-bordered"
					>
						<option>ADMIN</option>
						<option>USER</option>
						<option>READ_ONLY</option>
					</select>
				</div>
				<div className="flex justify-end">
					<button
						onClick={() =>
							addUser({
								organizationId,
								userId: state.userId,
								userName: state.name,
								organizationRole: state.role,
							})
						}
						className="btn btn-sm btn-primary"
					>
						{b("submit")}
					</button>
				</div>
			</div>
		</div>
	);
};

export default InviteByUsers;
