import React from "react";
import InputFields from "~/components/elements/inputField";
import { api } from "~/utils/api";
import TimeAgo from "react-timeago";
import { useModalStore } from "~/utils/store";
import { CopyToClipboard } from "react-copy-to-clipboard";
import toast from "react-hot-toast";
import cn from "classnames";
import { useTranslations } from "next-intl";

const InvitationLink = () => {
	const { callModal, closeModal } = useModalStore((state) => state);
	const { mutate: deleteInvitation } = api.admin.deleteInvitationLink.useMutation();

	const { data: invitationLink, refetch: refetchInvitations } =
		api.admin.getInvitationLink.useQuery();

	const showInviationDetails = (invite) => {
		callModal({
			title: "Invitation Details",
			rootStyle: "text-left",
			showButtons: true,
			closeModalOnSubmit: true,
			content: (
				<div>
					<p>
						Secret: <span className="text-primary">{invite.secret}</span>
					</p>
					<p>
						Expires: <TimeAgo date={invite.expires} />
					</p>
					<p>Times used: {`${invite.timesUsed}/${invite.timesCanUse || 1}`}</p>
					<div>
						Invitation Link:
						<CopyToClipboard
							text={invite.url}
							onCopy={() => toast.success("link copied to clipboard")}
							title={"copyToClipboard.title"}
						>
							<div
								style={{ wordWrap: "break-word" }}
								className="cursor-pointer text-blue-500"
							>
								<p className="pt-5 text-sm text-gray-400">click to copy</p>
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
							Delete
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
					<p className="pt-5 text-sm text-gray-400">Active invitations</p>
					<div className="flex gap-3">
						{invitationLink?.map((link) => {
							const expired = new Date(link.expires) < new Date();
							return (
								<div
									onClick={() => showInviationDetails(link)}
									className="cursor-pointer"
								>
									<p
										className={cn("text-md badge", {
											"bg-primary": !expired,
											"bg-error": expired,
										})}
									>
										{link.secret}
										<span className="pl-1">
											{`${link.timesUsed}/${link.timesCanUse || 1}`} --{" "}
										</span>
										{`${expired ? "Expired" : "Expires in"}`}
										{!expired && (
											<span className="pl-1">
												<TimeAgo date={link.expires} />
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
const UserInvitation = () => {
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
				buttonText={t("changeButton.generate")}
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

export default UserInvitation;
