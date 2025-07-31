import React from "react";
import InputFields from "~/components/elements/inputField";
import { api } from "~/utils/api";
import TimeAgo from "react-timeago";
import { useModalStore } from "~/utils/store";
import { CopyToClipboard } from "react-copy-to-clipboard";
import toast from "react-hot-toast";
import cn from "classnames";
import { useTranslations } from "next-intl";
import {
	useTrpcApiErrorHandler,
	useTrpcApiSuccessHandler,
} from "~/hooks/useTrpcApiHandler";
import { InvitationLinkType } from "~/types/invitation";

const ActiveInvitationsList = () => {
	const t = useTranslations();
	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();

	const callModal = useModalStore((state) => state.callModal);
	const closeModal = useModalStore((state) => state.closeModal);

	const { data: invitationData, refetch: refetchInvitations } =
		api.admin.getInvitationLink.useQuery();

	const { mutate: deleteInvitation } = api.admin.deleteInvitationLink.useMutation({
		onSuccess: handleApiSuccess({
			actions: [refetchInvitations, closeModal],
			toastMessage: t("commonToast.deletedSuccessfully"),
		}),
		onError: handleApiError,
	});

	const showInviationDetails = (invite: InvitationLinkType) => {
		const expired = new Date(invite.expiresAt) < new Date() || invite?.used;
		callModal({
			title: t("admin.users.authentication.generateInvitation.invitationModal.header"),
			rootStyle: "text-left",
			showButtons: false,
			closeModalOnSubmit: true,
			content: (
				<div>
					<p>
						<span className="text-gray-400">
							{t(
								"admin.users.authentication.generateInvitation.invitationModal.secretLabel",
							)}
						</span>
						<span className="text-primary pl-1">{invite.secret}</span>
					</p>
					{invite?.groupName ? (
						<p>
							<span className="text-gray-400">
								{t(
									"admin.users.authentication.generateInvitation.invitationModal.groupIdLabel",
								)}
							</span>
							<span className="text-primary pl-1">{invite?.groupName}</span>
						</p>
					) : null}
					<p>
						<span className="text-gray-400">
							{t(
								"admin.users.authentication.generateInvitation.invitationModal.expiresLabel",
							)}{" "}
						</span>
						{expired ? (
							<span className="text-error">Expired</span>
						) : (
							<span>
								Expires in <TimeAgo date={invite.expiresAt} />
							</span>
						)}
					</p>
					<p>
						<span className="text-gray-400">
							{t(
								"admin.users.authentication.generateInvitation.invitationModal.timesUsedLabel",
							)}{" "}
						</span>
						{`${invite.timesUsed}/${invite.timesCanUse || 1}`}
					</p>
					<div>
						<span className="text-gray-400">
							{t(
								"admin.users.authentication.generateInvitation.invitationModal.invitationLinkLabel",
							)}
						</span>
						<CopyToClipboard
							text={invite.url}
							onCopy={() =>
								toast.success(
									t(
										"admin.users.authentication.generateInvitation.invitationModal.linkCopiedToast",
									),
								)
							}
							title={"copyToClipboard.title"}
						>
							<div
								style={{ wordWrap: "break-word" }}
								className="cursor-pointer text-blue-500"
							>
								<p className="pt-5 text-sm text-gray-400">
									{t(
										"admin.users.authentication.generateInvitation.invitationModal.clickToCopyLabel",
									)}
								</p>
								{invite.url}
							</div>
						</CopyToClipboard>
					</div>
					<div className="py-10">
						<button
							onClick={() => {
								deleteInvitation({ id: invite.id });
							}}
							className="btn btn-sm btn-error btn-outline"
						>
							{t(
								"admin.users.authentication.generateInvitation.invitationModal.deleteButton",
							)}
						</button>
					</div>
				</div>
			),
		});
	};

	if (!invitationData?.length) {
		return (
			<div className="text-center py-8 text-gray-500">
				<p>{t("admin.users.authentication.generateInvitation.emptyState.noInvitations")}</p>
				<p className="text-sm mt-1">
					{t("admin.users.authentication.generateInvitation.emptyState.createInvitation")}
				</p>
			</div>
		);
	}

	return (
		<div className="flex flex-wrap gap-3">
			{invitationData?.map((invite) => {
				const expired = new Date(invite.expiresAt) < new Date() || invite?.used;
				return (
					<div
						key={invite.id}
						className={cn(
							"card shadow-sm border p-3 min-w-48 cursor-pointer hover:shadow-md transition-shadow",
							{
								"bg-primary text-primary-content border-primary": !expired,
								"bg-error text-error-content border-error": expired,
								"bg-base-200 border-base-300": false, // Never applies due to above conditions
							},
						)}
						onClick={() => showInviationDetails(invite)}
					>
						<div className="flex justify-between items-start">
							<div className="flex-1">
								<div className="font-medium text-sm mb-1">{invite.secret}</div>
								<div className="text-xs opacity-75 mb-1">
									{`${invite.timesUsed}/${invite.timesCanUse || 1}`} uses
								</div>
								{invite?.groupName && (
									<div className="text-xs opacity-75 mb-1">📁 {invite.groupName}</div>
								)}
								<div className="text-xs opacity-90">
									{expired ? (
										<>❌ Expired</>
									) : (
										<>
											⏰ Expires in <TimeAgo date={invite.expiresAt} />
										</>
									)}
								</div>
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
									className="h-3 w-3 cursor-pointer hover:opacity-70"
									onClick={() => {
										callModal({
											title: t("admin.users.authentication.generateInvitation.deleteConfirmation.title"),
											description: t("admin.users.authentication.generateInvitation.deleteConfirmation.description"),
											yesAction: () => {
												deleteInvitation({ id: invite.id });
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

const UserInvitationLink = () => {
	const t = useTranslations();

	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();

	const { data: invitationData, refetch: refetchInvitations } = api.admin.getInvitationLink.useQuery();
	const { data: userGroups } = api.admin.getUserGroups.useQuery();
	const { mutate: generateInvitation } = api.admin.generateInviteLink.useMutation({
		onSuccess: handleApiSuccess({ actions: [refetchInvitations] }),
		onError: handleApiError,
	});

	const { data: options } = api.admin.getAllOptions.useQuery();

	const groupOptions = userGroups?.map((group) => ({
		label: `${group.name} (Max ${group.maxNetworks} Networks)`,
		value: group?.id.toString(),
	}));

	// add default none group
	groupOptions?.unshift({ label: "None", value: null });

	return (
		<div className="space-y-8">
			{/* Description */}
			<div>
				<p className="text-sm text-gray-500">
					{t("admin.users.authentication.generateInvitation.description")}
				</p>
			</div>

			{/* Generate New Invitation Section */}
			<div>
				<InputFields
					disabled={options?.enableRegistration}
					isLoading={false}
					label={t("admin.users.authentication.generateInvitation.header")}
					rootFormClassName="flex flex-col space-y-4"
					size="sm"
					placeholder=""
					buttonText={t("commonButtons.generate")}
					fields={[
						{
							name: "secret",
							type: "text",
							description: t(
								"admin.users.authentication.generateInvitation.secretMessageLabel",
							),
							placeholder: t(
								"admin.users.authentication.generateInvitation.secretMessagePlaceholder",
							),
							defaultValue: "",
						},
						{
							name: "expireTime",
							type: "number",
							placeholder: t(
								"admin.users.authentication.generateInvitation.expireTimePlaceholder",
							),
							description: t(
								"admin.users.authentication.generateInvitation.expireTimeLabel",
							),
							defaultValue: "",
						},
						{
							name: "timesCanUse",
							type: "number",
							placeholder: t(
								"admin.users.authentication.generateInvitation.timeUsedPlaceholder",
							),
							description: t(
								"admin.users.authentication.generateInvitation.timeUsedLabel",
							),
							defaultValue: "",
						},
						{
							name: "groupId",
							description: t(
								"admin.users.authentication.generateInvitation.assignGroupLabel",
							),
							selectOptions: groupOptions,
							elementType: "select",
							defaultValue: "",
						},
					]}
					submitHandler={(params) => {
						return new Promise((resolve) => {
							void generateInvitation(
								{
									...params,
								},
								{
									onSuccess: () => {
										resolve(true);
									},
								},
							);
						});
					}}
				/>
			</div>

			{/* Active Invitations Section - Only show if invitations exist */}
			{invitationData && invitationData.length > 0 && (
				<div className="space-y-4">
					<div>
						<h3 className="text-lg font-semibold text-base-content mb-1">
							{t("admin.users.authentication.generateInvitation.activeInvitationsLabel")}
						</h3>
						<p className="text-sm text-base-content/70">
							{t("admin.users.authentication.generateInvitation.activeInvitationsDescription")}
						</p>
					</div>
					<ActiveInvitationsList />
				</div>
			)}
		</div>
	);
};

export default UserInvitationLink;
