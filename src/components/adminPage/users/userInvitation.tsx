import React from "react";
import InputFields from "~/components/elements/inputField";
import { api } from "~/utils/api";
import TimeAgo from "react-timeago";
import { useModalStore } from "~/utils/store";
import { CopyToClipboard } from "react-copy-to-clipboard";
import toast from "react-hot-toast";
import cn from "classnames";
import { useTranslations } from "next-intl";
import { UserInvitation } from "@prisma/client";

const InvitationLink = () => {
	const t = useTranslations();
	const { callModal, closeModal } = useModalStore((state) => state);
	const { mutate: deleteInvitation } = api.admin.deleteInvitationLink.useMutation();

	const { data: invitationLink, refetch: refetchInvitations } =
		api.admin.getInvitationLink.useQuery();

	const showInviationDetails = (invite: UserInvitation) => {
		const expired = new Date(invite.expires) < new Date() || invite?.used;
		callModal({
			title: t("admin.users.authentication.generateInvitation.invitationModal.header"),
			rootStyle: "text-left",
			showButtons: true,
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
								Expires in <TimeAgo date={invite.expires} />
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
								deleteInvitation(
									{ id: invite.id },
									{
										onSuccess: () => {
											void refetchInvitations();
											closeModal();
										},
									},
								);
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
	return (
		<div>
			{invitationLink?.length > 0 ? (
				<>
					<p className="pt-5 text-sm text-gray-400">
						{t("admin.users.authentication.generateInvitation.activeInvitationsLabel")}
					</p>
					<div className="flex gap-3">
						{invitationLink?.map((invite) => {
							const expired = new Date(invite.expires) < new Date() || invite?.used;
							return (
								<div
									key={invite.id}
									onClick={() => showInviationDetails(invite)}
									className="cursor-pointer"
								>
									<p
										className={cn("text-md badge", {
											"bg-primary": !expired,
											"bg-error": expired,
										})}
									>
										{invite.secret}
										<span className="pl-1">
											{`${invite.timesUsed}/${invite.timesCanUse || 1}`} --{" "}
										</span>
										{`${expired ? "Expired" : "Expires in"}`}
										{!expired && (
											<span className="pl-1">
												<TimeAgo date={invite.expires} />
											</span>
										)}
									</p>
								</div>
							);
						})}
					</div>{" "}
				</>
			) : null}
		</div>
	);
};

const UserInvitationLink = () => {
	const t = useTranslations();

	const { mutate: generateInvitation } = api.admin.generateInviteLink.useMutation();
	const { refetch: refetchInvitations } = api.admin.getInvitationLink.useQuery();
	const { data: options } = api.admin.getAllOptions.useQuery();
	return (
		<div className="pt-5">
			<InputFields
				disabled={options?.enableRegistration}
				isLoading={false}
				label={t("admin.users.authentication.generateInvitation.header")}
				rootFormClassName="flex flex-col space-y-2 w-6/6"
				size="sm"
				placeholder=""
				buttonText={t("buttons.generate")}
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
						description: t("admin.users.authentication.generateInvitation.timeUsedLabel"),
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
									void refetchInvitations();
									resolve(true);
								},
							},
						);
					});
				}}
			/>
			<InvitationLink />
		</div>
	);
};

export default UserInvitationLink;
