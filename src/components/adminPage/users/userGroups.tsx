import React from "react";
import InputFields from "~/components/elements/inputField";
import { api } from "~/utils/api";
import cn from "classnames";
import { useModalStore } from "~/utils/store";
import { UserGroup } from "@prisma/client";
import { useTranslations } from "next-intl";
import {
	useTrpcApiErrorHandler,
	useTrpcApiSuccessHandler,
} from "~/hooks/useTrpcApiHandler";

type UserGroupWithCount = UserGroup & {
	_count: {
		users: number;
	};
};
type GroupLabelProps = {
	groups: UserGroupWithCount[];
};

const GroupLabel = ({ groups }: GroupLabelProps) => {
	if (!Array.isArray(groups) || !groups) return null;
	const t = useTranslations("admin");
	const m = useTranslations("commonToast");

	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();

	const { refetch: refetchGroups } = api.admin.getUserGroups.useQuery();
	const callModal = useModalStore((state) => state.callModal);

	const { mutate: updateGroup } = api.admin.addUserGroup.useMutation({
		onError: handleApiError,
		onSuccess: handleApiSuccess({
			actions: [refetchGroups],
			toastMessage: m("updatedSuccessfully"),
		}),
	});

	const { mutate: deleteGroup } = api.admin.deleteUserGroup.useMutation({
		onError: handleApiError,
		onSuccess: handleApiSuccess({
			actions: [refetchGroups],
			toastMessage: m("deletedSuccessfully"),
		}),
	});
	return (
		<div className="flex flex-wrap gap-3 text-center">
			{groups?.map((group) => {
				return (
					<div
						key={group.id}
						className={cn("badge badge-lg rounded-md flex items-center", {
							"badge-primary": group.isDefault,
						})}
					>
						<div
							onClick={() => {
								// open modal
								callModal({
									title: <p>{t("users.groups.addGroup.editGroupTitle")}</p>,
									rootStyle: "text-left",
									showButtons: true,
									closeModalOnSubmit: true,
									content: (
										<InputFields
											isLoading={false}
											label=""
											rootClassName="flex-col space-y-2"
											rootFormClassName="flex flex-col space-y-2 "
											size="sm"
											openByDefault={true}
											showSubmitButtons={true}
											showCancelButton={false}
											placeholder=""
											buttonText={t("users.groups.addGroup.editGroupTitle")}
											fields={[
												{
													name: "groupName",
													type: "text",
													placeholder: t("users.groups.addGroup.groupNamePlaceholder"),
													description: t("users.groups.addGroup.groupNameDescription"),
													value: group?.name,
												},
												{
													name: "maxNetworks",
													type: "number",
													placeholder: t("users.groups.addGroup.networkLimitPlaceholder"),
													description: t("users.groups.addGroup.networkLimitDescription"),
													value: group?.maxNetworks.toString(),
												},
												{
													name: "isDefault",
													type: "checkbox",
													description: t("users.groups.addGroup.useAsDefaultDescription"),
													placeholder: t("users.groups.addGroup.useAsDefaultPlaceholder"),
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
								onClick={() => {
									callModal({
										title: t("users.groups.addGroup.deleteGroupTitle"),
										description: t("users.groups.addGroup.deleteGroupDescription"),
										yesAction: () => {
											deleteGroup({
												id: group.id,
											});
										},
									});
								}}
								// onClick={() =>
								// 	deleteGroup({
								// 		id: group.id,
								// 	})
								// }
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
	const t = useTranslations("admin");
	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();

	const { data: usergroups, refetch } = api.admin.getUserGroups.useQuery();

	const { mutate: addGroup } = api.admin.addUserGroup.useMutation({
		onError: handleApiError,
		onSuccess: handleApiSuccess({ actions: [refetch] }),
	});

	return (
		<div className="space-y-5">
			<div>
				<p className="text-sm text-gray-500">{t("users.groups.description")}</p>
			</div>
			<InputFields
				isLoading={false}
				label={t("users.groups.addGroup.addGroupLabel")}
				rootFormClassName="flex flex-col space-y-2 w-3/6"
				size="sm"
				placeholder=""
				buttonText={t("users.groups.addGroup.addGroupButton")}
				fields={[
					{
						name: "groupName",
						type: "text",
						placeholder: t("users.groups.addGroup.groupNamePlaceholder"),
						// fieldClassName: "max-w-sm",
						description: t("users.groups.addGroup.groupNameDescription"),
						defaultValue: "",
					},
					{
						name: "maxNetworks",
						type: "number",
						// fieldClassName: "w-3/6",
						placeholder: t("users.groups.addGroup.networkLimitPlaceholder"),
						description: t("users.groups.addGroup.networkLimitDescription"),
						defaultValue: "",
					},
					{
						name: "isDefault",
						type: "checkbox",
						description: t("users.groups.addGroup.useAsDefaultDescription"),
						placeholder: t("users.groups.addGroup.useAsDefaultPlaceholder"),
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
			<GroupLabel groups={usergroups as UserGroupWithCount[]} />
		</div>
	);
};

export default UserGroups;
