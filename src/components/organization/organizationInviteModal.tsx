import { Role } from "@prisma/client";
import { useTranslations } from "next-intl";
import React, { useState } from "react";
import toast from "react-hot-toast";
import ScrollableDropdown from "~/components/elements/dropdownlist";
import { api } from "~/utils/api";
import { useModalStore } from "~/utils/store";
import InviteByMail from "./inviteByMail";

interface Iprops {
	organizationId: string;
	// invite?: OrganizationInvitation & { tokenUrl: string };
}

const OrganizationInviteModal = ({ organizationId }: Iprops) => {
	const b = useTranslations("commonButtons");
	const t = useTranslations("admin");
	const [state, setState] = useState({
		userId: null,
		name: "",
		role: Role.USER,
	});

	const { closeModal } = useModalStore((state) => state);
	const { refetch: refecthOrgUsers } = api.org.getOrgUsers.useQuery({
		organizationId,
	});
	const { data: allUsers } = api.org.getPlatformUsers.useQuery({ organizationId });

	const { mutate: addUser } = api.org.addUser.useMutation();

	const dropDownHandler = (e) => {
		setState({
			...state,
			role: e.target.value,
		});
	};
	return (
		<div className="grid grid-cols-[1fr,auto,1fr] gap-3">
			<div className="items-start gap-4 space-y-3">
				<p className="text-xl">Invite Application Users</p>
				<div className="space-y-10">
					<div className="form-control">
						<p className="text-sm text-gray-400">
							{t("organization.listOrganization.invitationModal.description")}
						</p>
						<label className="label">
							<span className="label-text">
								{t(
									"organization.listOrganization.invitationModal.inputFields.searchUser.title",
								)}
							</span>
						</label>
						<ScrollableDropdown
							items={allUsers}
							displayField="name"
							idField="id"
							placeholder={t(
								"organization.listOrganization.invitationModal.inputFields.searchUser.placeholder",
							)}
							onOptionSelect={(selectedItem) => {
								setState({ ...state, userId: selectedItem.id, name: selectedItem.name });
							}}
						/>
					</div>
					<div className="form-control">
						<label className="label">
							<span className="label-text">
								{t(
									"organization.listOrganization.invitationModal.inputFields.userRole.title",
								)}
							</span>
						</label>
						<div className="form-control w-full max-w-xs">
							<select
								value={state?.role as string}
								onChange={(e) => dropDownHandler(e)}
								className="select select-sm select-bordered  select-ghost max-w-xs"
							>
								<option>ADMIN</option>
								<option>USER</option>
								<option>READ_ONLY</option>
							</select>
						</div>
					</div>
					<div className="form-control">
						<button
							onClick={() =>
								addUser(
									{
										organizationId,
										userId: state.userId,
										userName: state.name,
										organizationRole: state.role,
									},
									{
										onSuccess: () => {
											toast.success("User added successfully");
											refecthOrgUsers();
											closeModal();
										},
									},
								)
							}
							className="btn btn-sm btn-primary"
						>
							{b("inviteUser")}
						</button>
					</div>
				</div>
			</div>

			<div className="divider divider-horizontal flex justify-center">OR</div>
			<div>
				<p className="text-xl">Invite by mail</p>
				<InviteByMail organizationId={organizationId} />
			</div>
		</div>
	);
};

export default OrganizationInviteModal;
