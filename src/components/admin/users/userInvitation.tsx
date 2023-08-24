import React from "react";
import InputFields from "~/components/elements/inputField";
import { api } from "~/utils/api";
import TimeAgo from "react-timeago";
import { useModalStore } from "~/utils/store";
import { CopyToClipboard } from "react-copy-to-clipboard";
import toast from "react-hot-toast";

const UserInvitation = () => {
	const { mutate: generateInvitation } = api.admin.generateInviteLink.useMutation();
	const { mutate: deleteInvitation } = api.admin.deleteInvitationLink.useMutation();
	const { data: invitationLink, refetch: refetchInvitations } =
		api.admin.getInvitationLink.useQuery();
	const { callModal, closeModal } = useModalStore((state) => state);

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
		<div className="pt-5">
			<InputFields
				isLoading={false}
				label="Generate Invitation"
				rootFormClassName="flex flex-col space-y-2 w-6/6"
				size="sm"
				placeholder=""
				buttonText="Generate"
				fields={[
					{
						name: "secret",
						type: "text",
						placeholder: "Add secret message",
						description: "User will be asked to enter this message upon registration",
						defaultValue: "",
					},
					{
						name: "expireTime",
						type: "number",
						placeholder: "Expire time in minutes",
						description: "Invitation link will expire after this time",
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
			<div>
				<p className="pt-5 text-sm text-gray-400">Active invitations</p>
				{invitationLink?.map((link) => {
					return (
						<div onClick={() => showInviationDetails(link)} className="cursor-pointer">
							<p className="text-md badge badge-primary">
								{link.secret} -- Expires: <TimeAgo date={link.expires} />
							</p>
						</div>
					);
				})}
			</div>
		</div>
	);
};

export default UserInvitation;
