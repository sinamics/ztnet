import { useTranslations } from "next-intl";
import { useAsideChatStore, useModalStore, useSocketStore } from "~/utils/store";
import EditOrganizationModal from "./editOrgModal";
import { useSession } from "next-auth/react";
import { api } from "~/utils/api";
import Link from "next/link";
import { useRouter } from "next/router";

const AdminHamburgerMenu = ({ organization }) => {
	const b = useTranslations("commonButtons");
	return (
		<ul
			tabIndex={0}
			className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52"
		>
			<li>
				<Link
					href={`/organization/${organization?.id}/meta`}
					className="justify-between cursor-pointer uppercase"
				>
					<div className="rounded-full uppercase">{b("meta")}</div>
				</Link>
			</li>
			<li>
				<Link
					href={`/organization/${organization?.id}/webhooks`}
					className="justify-between cursor-pointer uppercase"
				>
					<div className="rounded-full uppercase">{b("addWebhooks")}</div>
				</Link>
			</li>
			<li>
				<Link
					href={`/organization/${organization?.id}/invite`}
					className="justify-between cursor-pointer uppercase"
				>
					{b("inviteUser")}
				</Link>
			</li>
		</ul>
	);
};

const AdminNavMenu = ({ organization }) => {
	const b = useTranslations("commonButtons");

	return (
		<div>
			<div className="dropdown dropdown-end">
				<Link
					href={`/organization/${organization?.id}/webhooks`}
					className="btn btn-ghost text-md"
				>
					<div className="rounded-full uppercase">{b("addWebhooks")}</div>
				</Link>
			</div>
			<div className="dropdown dropdown-end">
				<Link
					href={`/organization/${organization?.id}/invite`}
					className="btn btn-ghost text-md"
				>
					<div className="rounded-full uppercase">{b("inviteUser")}</div>
				</Link>
			</div>
			<div className="dropdown dropdown-end">
				<Link
					href={`/organization/${organization?.id}/meta`}
					className="btn btn-ghost text-md"
				>
					<div className="rounded-full uppercase">{b("meta")}</div>
				</Link>
			</div>
		</div>
	);
};

export const OrgNavBar = () => {
	const router = useRouter();
	const orgId = router.query.orgid as string;

	const { toggleChat } = useAsideChatStore();
	const { hasNewMessages } = useSocketStore();
	const { callModal } = useModalStore((state) => state);
	const { data: session } = useSession();

	const { data: meOrgRole } = api.org.getOrgUserRoleById.useQuery({
		organizationId: orgId,
		userId: session.user.id,
	});

	const { data: organization } = api.org.getOrgById.useQuery({
		organizationId: orgId,
	});

	return (
		<div className="navbar bg-base-200 rounded-md shadow-md">
			<div className="navbar-start">
				<div className="dropdown">
					<div tabIndex={0} role="button" className="btn btn-ghost xl:hidden">
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
					<div className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
						<div
							onClick={() => {
								callModal({
									title: (
										<p>
											<span>Edit Meta </span>
											<span className="text-primary">{organization?.orgName}</span>
										</p>
									),
									content: <EditOrganizationModal organizationId={organization?.id} />,
								});
							}}
							tabIndex={0}
							role="button"
							className="btn btn-ghost"
						>
							<div className="rounded-full">META</div>
						</div>
					</div>
					<AdminHamburgerMenu organization={organization} />
				</div>
				<Link
					href={`/organization/${organization?.id}`}
					className="btn btn-ghost text-xl hidden lg:inline-flex"
				>
					{organization?.orgName}
				</Link>
			</div>
			<div className="navbar-center hidden xl:flex ">
				{meOrgRole?.role === "ADMIN" ? (
					<AdminNavMenu organization={organization} />
				) : null}
			</div>
			<div className="navbar-end">
				<button
					onClick={() => {
						toggleChat(organization?.id);
					}}
					className="btn btn-ghost btn-circle"
				>
					<div className="flex">
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

						{hasNewMessages[organization?.id] ? (
							<span className="relative flex h-3 w-3">
								<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
								<span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
							</span>
						) : null}
					</div>
				</button>
			</div>
		</div>
	);
};
