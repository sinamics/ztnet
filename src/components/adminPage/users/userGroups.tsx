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
	expiresAt?: Date | null;
};
type GroupLabelProps = {
	groups: UserGroupWithCount[];
};

const GroupLabel = ({ groups }: GroupLabelProps) => {
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

	if (!Array.isArray(groups) || !groups) return null;

	return (
		<div className="flex flex-wrap gap-3 text-left">
			{groups?.map((group) => {
				const isExpired = group.expiresAt && new Date(group.expiresAt) < new Date();

				return (
					<div
						key={group.id}
						className={cn(
							"card shadow-sm border p-3 min-w-48 cursor-pointer hover:shadow-md transition-shadow",
							{
								"bg-primary text-primary-content border-primary":
									group.isDefault && !isExpired,
								"bg-error text-error-content border-error": isExpired,
								"bg-base-200 border-base-300": !group.isDefault && !isExpired,
							},
						)}
						onClick={() => {
							// open modal
							callModal({
								title: <p>{t("users.groups.addGroup.editGroupTitle")}</p>,
								rootStyle: "text-left",
								showButtons: false,
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
												name: "expiresAt",
												type: "date",
												placeholder: t("users.groups.addGroup.expirationDatePlaceholder"),
												description: t("users.groups.addGroup.expirationDateDescription"),
												value: group?.expiresAt
													? new Date(group.expiresAt).toISOString().slice(0, 10)
													: "",
												min: new Date().toISOString().slice(0, 10), // Prevent selecting dates in the past
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
					>
						<div className="flex justify-between items-start">
							<div className="flex-1">
								<div className="font-medium text-sm mb-1">{group.name}</div>
								<div className="text-xs opacity-75 mb-1">
									{group._count.users} {group._count.users === 1 ? "user" : "users"}
								</div>
								{group.expiresAt && (
									<div
										className={cn("text-xs px-1.5 py-0.5 rounded-full inline-block", {
											"bg-error text-error-content opacity-100": isExpired,
											"bg-warning text-warning-content opacity-90": !isExpired,
										})}
									>
										{isExpired ? (
											<>
												❌ {t("users.groups.addGroup.expiredLabel")}:{" "}
												{new Date(group.expiresAt).toLocaleDateString()}
											</>
										) : (
											<>
												⏰ {t("users.groups.addGroup.expiresLabel")}:{" "}
												{new Date(group.expiresAt).toLocaleDateString()}
											</>
										)}
									</div>
								)}
								{isExpired && (
									<div className="text-xs mt-1 opacity-90 font-medium">
										⚠️ {t("users.groups.addGroup.expiredGroupWarning")}
									</div>
								)}
								{group.isDefault && !isExpired && (
									<div className="text-xs mt-0.5 opacity-90">📌 Default Group</div>
								)}
							</div>

							<div
								className="ml-1"
								onClick={(e) => {
									e.stopPropagation(); // Prevent card click when clicking delete button
								}}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									strokeWidth="1.5"
									stroke="currentColor"
									className="h-3 w-3 cursor-pointer text-error hover:text-error-focus"
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
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
									/>
								</svg>
							</div>
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
		<div className="space-y-8">
			{/* Description */}
			<div>
				<p className="text-sm text-gray-500">{t("users.groups.description")}</p>
			</div>

			{/* Add New Group Section */}
			<div>
				<InputFields
					isLoading={false}
					label={t("users.groups.addGroup.addGroupLabel")}
					rootFormClassName="flex flex-col space-y-4"
					size="sm"
					placeholder=""
					buttonText={t("users.groups.addGroup.addGroupButton")}
					fields={[
						{
							name: "groupName",
							type: "text",
							placeholder: t("users.groups.addGroup.groupNamePlaceholder"),
							description: t("users.groups.addGroup.groupNameDescription"),
							defaultValue: "",
						},
						{
							name: "maxNetworks",
							type: "number",
							placeholder: t("users.groups.addGroup.networkLimitPlaceholder"),
							description: t("users.groups.addGroup.networkLimitDescription"),
							defaultValue: "",
						},
						{
							name: "expiresAt",
							type: "date",
							placeholder: t("users.groups.addGroup.expirationDatePlaceholder"),
							description: t("users.groups.addGroup.expirationDateDescription"),
							defaultValue: "",
							min: new Date().toISOString().slice(0, 10), // Prevent selecting dates in the past
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
			</div>

			{/* Existing Groups Section - Only show if groups exist */}
			{usergroups && usergroups.length > 0 && (
				<div className="space-y-4">
					<div>
						<h3 className="text-lg font-semibold text-base-content mb-1">
							{t("users.groups.existingGroups.title")}
						</h3>
						<p className="text-sm text-base-content/70">
							{t("users.groups.existingGroups.description")}
						</p>
					</div>
					<GroupLabel groups={usergroups as UserGroupWithCount[]} />
				</div>
			)}
		</div>
	);
};

export default UserGroups;
