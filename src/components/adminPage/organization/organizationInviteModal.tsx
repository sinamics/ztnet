import React, { useState } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import toast from "react-hot-toast";
import { api } from "~/utils/api";

interface Iprops {
	organizationId: string;
}

const OrganizationInviteModal = ({ organizationId }: Iprops) => {
	const [email, setEmail] = useState({ inviteEmail: "" });
	const { mutate: genInviteLink, data: inviteLink } =
		api.org.generateInviteLink.useMutation();

	const inputHandler = (e) => {
		setEmail({
			...email,
			[e.target.name]: e.target.value,
		});
	};

	return (
		<div className="grid grid-cols-4 items-start gap-4">
			<div className="col-span-4">
				{/* <header className="text-sm">User Email</header> */}

				<div className="form-control max-w-xs">
					<label className="label">
						<span className="label-text">Generate a token based on users email</span>
					</label>
					<form className="flex justify-between">
						<input
							type="email"
							name="inviteEmail"
							onChange={inputHandler}
							placeholder="email"
							className="input input-bordered input-sm"
						/>
						<button
							onClick={(e) => {
								e.preventDefault();
								genInviteLink(
									{
										organizationId,
										email: email.inviteEmail,
									},
									{
										onSuccess: () => {
											toast.success("Link generated successfully");
											setEmail({ inviteEmail: "" });
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
			</div>
			{inviteLink ? (
				<div className="col-span-4">
					<header className="text-sm">Generated Link (Click to Copy)</header>
					<div className="form-control max-w-md">
						<CopyToClipboard
							text={inviteLink}
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
								{inviteLink}
							</div>
						</CopyToClipboard>
					</div>
					<div className="col-span-4 pt-10">
						<button className="btn btn-sm">Send Invitation by mail</button>
					</div>
				</div>
			) : null}
		</div>
	);
};

export default OrganizationInviteModal;
