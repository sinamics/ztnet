import React from "react";
import InputFields from "~/components/elements/inputField";
import { ErrorData } from "~/types/errorHandling";
import { api } from "~/utils/api";
import toast from "react-hot-toast";
import cn from "classnames";
import { useModalStore } from "~/utils/store";

const UserLabel = ({ groups }) => {
	if (!Array.isArray(groups) || !groups) return null;
	const { refetch } = api.admin.getUserGroups.useQuery();
	const { callModal } = useModalStore((state) => state);
	const { mutate: updateGroup } = api.admin.addUserGroup.useMutation({
		onError: (error) => {
			if ((error.data as ErrorData)?.zodError) {
				const fieldErrors = (error.data as ErrorData)?.zodError.fieldErrors;
				for (const field in fieldErrors) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-call
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
			refetch();
		},
	});
	const { mutate: deleteGroup } = api.admin.deleteUserGroup.useMutation({
		onError: (error) => {
			if ((error.data as ErrorData)?.zodError) {
				const fieldErrors = (error.data as ErrorData)?.zodError.fieldErrors;
				for (const field in fieldErrors) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-call
					toast.error(`${fieldErrors[field].join(", ")}`);
				}
			} else if (error.message) {
				toast.error(error.message);
			} else {
				toast.error("An unknown error occurred");
			}
		},
		onSuccess: () => {
			toast.success("Group deleted successfully");
			refetch();
		},
	});
	return (
		<div className="flex flex-wrap gap-3 text-center">
			{groups.map((group) => {
				return (
					<div
						key={group.id}
						className={cn("badge  badge-lg rounded-md flex items-center", {
							"badge-primary": group.isDefault,
						})}
					>
						<div
							onClick={() => {
								// open modal
								callModal({
									title: <p>Edit Group</p>,
									rootStyle: "text-left",
									showButtons: true,
									closeModalOnSubmit: true,
									content: (
										<InputFields
											isLoading={false}
											label=""
											rootClassName="flex-col space-y-2 "
											rootFormClassName="flex flex-col space-y-2 "
											size="sm"
											openByDefault={true}
											showSubmitButtons={true}
											showCancelButton={false}
											placeholder=""
											buttonText="Edit Group"
											fields={[
												{
													name: "groupName",
													type: "text",
													placeholder: "Group Name",
													description: "Enter a name for the new group",
													value: group?.name,
												},
												{
													name: "maxNetworks",
													type: "number",
													placeholder: "Network Limit",
													description:
														"Set the maximum number of networks that can be created by users in this group",
													value: group?.maxNetworks.toString(),
												},
												{
													name: "isDefault",
													type: "checkbox",
													description:
														"Set this group as the default group for new users",
													placeholder: "Use as Default",
													value: group?.isDefault,
												},
											]}
											submitHandler={(params) =>
												void updateGroup({
													id: group.id,
													...params,
												})
											}
										/>
									),
								});
							}}
							className="cursor-pointer"
						>
							{group.name}
						</div>

						<div>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								strokeWidth="1.5"
								stroke="currentColor"
								className="z-10 ml-4 h-4 w-4 cursor-pointer text-warning"
								onClick={() =>
									deleteGroup({
										id: group.id,
									})
								}
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
								/>
							</svg>
						</div>
					</div>
				);
			})}
		</div>
	);
};
const UserGroups = () => {
	const { data: usergroups, refetch } = api.admin.getUserGroups.useQuery();

	const { mutate: addGroup } = api.admin.addUserGroup.useMutation({
		onError: (error) => {
			if ((error.data as ErrorData)?.zodError) {
				const fieldErrors = (error.data as ErrorData)?.zodError.fieldErrors;
				for (const field in fieldErrors) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-call
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
			refetch();
		},
	});

	return (
		<div className="space-y-10">
			<UserLabel groups={usergroups} />
			<InputFields
				isLoading={false}
				label="Add new group"
				rootFormClassName="flex flex-col space-y-2 "
				size="sm"
				placeholder=""
				buttonText="Add Group"
				fields={[
					{
						name: "groupName",
						type: "text",
						placeholder: "Group Name",
						// fieldClassName: "max-w-sm",
						description: "Enter a name for the new group",
						defaultValue: "",
					},
					{
						name: "maxNetworks",
						type: "number",
						// fieldClassName: "w-3/6",
						placeholder: "Network Limit",
						description:
							"Set the maximum number of networks that can be created by users in this group",
						defaultValue: "",
					},
					{
						name: "isDefault",
						type: "checkbox",
						description: "Set this group as the default group for new users",
						placeholder: "Use as Default",
						defaultValue: false,
					},
				]}
				submitHandler={(params) =>
					new Promise((resolve) => {
						void addGroup(
							{
								...params,
							},
							{
								onSuccess: () => {
									resolve(true);
								},
							},
						);
					})
				}
			/>
		</div>
	);
};

export default UserGroups;
