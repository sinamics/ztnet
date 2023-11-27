import { Role } from "@prisma/client";
import React, { useState } from "react";
import toast from "react-hot-toast";
import ScrollableDropdown from "~/components/elements/dropdownlist";
import { api } from "~/utils/api";
import { useModalStore } from "~/utils/store";

interface Iprops {
	organizationId: string;
	// invite?: OrganizationInvitation & { tokenUrl: string };
}

const OrganizationInviteModal = ({ organizationId }: Iprops) => {
	const [state, setState] = useState({
		userId: null,
		role: Role.USER,
	});

	const { closeModal } = useModalStore((state) => state);
	const { data: allUsers } = api.admin.getUsers.useQuery({ isAdmin: false });
	// const { refetch: refetchOrganization } = api.org.getAllOrg.useQuery();

	const { mutate: addUser } = api.org.addUser.useMutation();

	const dropDownHandler = (e) => {
		setState({
			...state,
			role: e.target.value,
		});
	};
	return (
		<div className="grid grid-cols-4 items-start gap-4">
			<div className="col-span-4 space-y-10">
				<div className="form-control max-w-xs">
					<label className="label">
						<span className="label-text">Search the user you want to add</span>
					</label>
					<ScrollableDropdown
						items={allUsers}
						displayField="name"
						valueField="id"
						placeholder="Search User"
						onOptionSelect={(selectedItem) =>
							setState({ ...state, userId: selectedItem.id })
						}
					/>
				</div>
				<div className="form-control max-w-xs">
					<label className="label">
						<span className="label-text">Set the user role</span>
					</label>
					<div className="form-control w-full max-w-xs">
						<select
							value={state?.role as string}
							onChange={(e) => dropDownHandler(e)}
							className="select select-sm select-bordered  select-ghost max-w-xs"
						>
							<option>READ_ONLY</option>
							<option>USER</option>
						</select>
					</div>
				</div>
				<div className="form-control max-w-xs">
					<button
						onClick={() =>
							addUser(
								{
									organizationId,
									userId: state.userId,
									organizationRole: state.role,
								},
								{
									onSuccess: () => {
										toast.success("User added successfully");
										closeModal();
									},
								},
							)
						}
						className="btn btn-sm"
					>
						Invite User
					</button>
				</div>
				{/* <form className="flex justify-between">
						<Input
							type="text"
							className="input-bordered input-sm"
							name="name"
							placeholder="Search User"
							value={state?.name || ""}
							onChange={inputHandler}
							list="user-list"
						/>
						<datalist
							id="user-list"
							className="max-h-[20px]"
							style={{ maxHeight: "5px" }}
						>
							{allUsers?.map((user) => (
								<option key={user.name} value={user.name} />
							))}
						</datalist>
						<button
							onClick={(e) => {
								e.preventDefault();
							}}
							type="submit"
							className="btn btn-sm"
						>
							{" "}
							Invite User
						</button>
					</form> */}

				{/* <form className="flex justify-between">
						<input
							type="email"
							name="inviteEmail"
							onChange={inputHandler}
							value={state.inviteEmail}
							placeholder="email"
							className="input input-bordered input-sm"
						/>
						<button className="btn btn-sm">Invite User</button>
					</form> */}
			</div>
			{/* <div className="col-span-4">
				<div className="form-control max-w-xs">
					<label className="label">
						<span className="label-text">Generate a token based on users email</span>
					</label>
					<form className="flex justify-between">
						<input
							type="email"
							name="inviteEmail"
							onChange={inputHandler}
							value={state.inviteEmail}
							placeholder="email"
							className="input input-bordered input-sm"
						/>
						<button
							onClick={(e) => {
								e.preventDefault();
								genInviteLink(
									{
										organizationId,
										email: state.inviteEmail,
									},
									{
										onSuccess: () => {
											toast.success("Link generated successfully");
											setState({ inviteEmail: "" });
											refetchOrganization();
										},
									},
								);
							}}
							type="submit"
							className="btn btn-sm"
						>
							Generate Link
						</button>
					</form>
				</div>
			</div> */}
			{/* {inviteData?.invitationLink || invite?.email ? (
				<div className="col-span-4">
					<header className="text-sm">Generated Link (Click to Copy)</header>
					<div className="form-control max-w-md">
						<CopyToClipboard
							text={inviteData?.invitationLink || invite?.tokenUrl}
							onCopy={() =>
								toast.success(
									"Link copied to clipboard. You can now send it to the user.",
								)
							}
							title={"copyToClipboard.title"}
						>
							<div
								style={{ wordWrap: "break-word" }}
								className="cursor-pointer text-blue-500"
							>
								{inviteData?.invitationLink || invite?.tokenUrl}
							</div>
						</CopyToClipboard>
					</div>
					<div className="col-span-4 pt-10 flex justify-between">
						<button className="btn btn-sm">Send Invitation by mail</button>
						<button
							onClick={() =>
								deleteInvite(
									{
										organizationId,
										token: inviteData?.encryptedToken || invite?.token,
									},
									{
										onSuccess: () => {
											toast.success("Invite deleted successfully");
											refetchOrganization();
											closeModal();
										},
									},
								)
							}
							className="btn btn-sm btn-error btn-outline"
						>
							Delete Invite
						</button>
					</div>
				</div>
			) : null} */}
		</div>
	);
};

export default OrganizationInviteModal;
