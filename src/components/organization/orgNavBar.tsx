import { useTranslations } from "next-intl";
import { useAsideChatStore, useModalStore, useSocketStore } from "~/utils/store";
import OrganizationWebhook from "./webhookModal";
import OrganizationInviteModal from "../adminPage/organization/organizationInviteModal";
import EditOrganizationModal from "./editOrgModal";

export const OrgNavBar = ({ title, orgData }) => {
	const { callModal } = useModalStore((state) => state);
	const { toggleChat } = useAsideChatStore();
	const { hasNewMessages } = useSocketStore();
	const t = useTranslations();

	return (
		<div className="navbar bg-base-200 rounded-md shadow-md">
			<div className="navbar-start">
				<div className="dropdown dropdown-end">
					<div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-5 w-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
								d="M4 6h16M4 12h8m-8 6h16"
							/>
						</svg>
					</div>
					<ul
						tabIndex={0}
						className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52"
					>
						<li>
							<a>Item 1</a>
						</li>
						<li>
							<a>Parent</a>
							<ul className="p-2">
								<li>
									<a>Submenu 1</a>
								</li>
								<li>
									<a>Submenu 2</a>
								</li>
							</ul>
						</li>
						<li>
							<a>Item 3</a>
						</li>
					</ul>
				</div>
				<a className="btn btn-ghost text-xl">{title}</a>
			</div>
			<div className="navbar-center hidden lg:flex ">
				<div className="dropdown dropdown-end">
					<div tabIndex={0} role="button" className="btn btn-ghost">
						<div className="rounded-full">WEBHOOKS</div>
					</div>
					<ul
						tabIndex={0}
						className="bg-base-300 menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow  rounded-box w-52"
					>
						<li
							onClick={() => {
								callModal({
									rootStyle: "h-4/6",
									title: (
										<p>
											<span>
												{t.rich(
													"admin.organization.listOrganization.webhookModal.createWebhookTitle",
													{
														span: (children) => (
															<span className="text-primary">{children}</span>
														),
														organization: orgData.orgName,
													},
												)}
											</span>
										</p>
									),
									content: <OrganizationWebhook organizationId={orgData.id} />,
								});
							}}
						>
							<p className="justify-between">
								Create
								<span className="badge">New</span>
							</p>
						</li>
					</ul>
				</div>
				<div className="dropdown dropdown-end">
					<div
						onClick={() =>
							callModal({
								rootStyle: "h-3/6",
								title: (
									<p>
										<span>
											{t("admin.organization.listOrganization.invitationModal.title")}
										</span>
									</p>
								),
								content: <OrganizationInviteModal organizationId={orgData.id} />,
							})
						}
						tabIndex={0}
						role="button"
						className="btn btn-ghost"
					>
						<div className="rounded-full">INVITE USER</div>
					</div>
				</div>
				<div className="dropdown dropdown-end">
					<div
						onClick={() => {
							callModal({
								title: (
									<p>
										<span>Edit Meta </span>
										<span className="text-primary">{orgData.orgName}</span>
									</p>
								),
								content: <EditOrganizationModal organizationId={orgData.id} />,
							});
						}}
						tabIndex={0}
						role="button"
						className="btn btn-ghost"
					>
						<div className="rounded-full">META</div>
					</div>
				</div>
			</div>
			<div className="navbar-end">
				{/* <button className="btn btn-ghost btn-circle">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-5 w-5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2"
							d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
						/>
					</svg>
				</button> */}
				<button
					onClick={() => {
						toggleChat(orgData.id);
					}}
					className="btn btn-ghost btn-circle"
				>
					<div className="indicator">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							strokeWidth={1.5}
							stroke="currentColor"
							className="w-6 h-6"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
							/>
						</svg>

						{hasNewMessages[orgData.id] ? (
							<span className="badge badge-xs badge-primary indicator-item"></span>
						) : null}
					</div>
				</button>
			</div>
		</div>
	);
};
