import { useTranslations } from "next-intl";
import { useRouter } from "next/router";
import { ReactElement, useState } from "react";
import ScrollableDropdown from "~/components/elements/dropdownlist";
import { LayoutOrganizationAuthenticated } from "~/components/layouts/layout";
import InviteByMail from "~/components/organization/inviteByMail";
import { getServerSideProps } from "~/server/getServerSideProps";
import { api } from "~/utils/api";

// interface Iprops {
// 	organizationId: string;
// }

const Invites = () => {
	const t = useTranslations("admin");
	const router = useRouter();
	const organizationId = router.query.orgid as string;

	const [state, setState] = useState({
		userId: null,
		name: "",
		role: "",
	});

	// get the organization id from the query
	const { data: allUsers } = api.org.getPlatformUsers.useQuery({ organizationId });
	const { data: orgInvites } = api.org.getInvites.useQuery({ organizationId });

	const dropDownHandler = (e) => {
		setState({
			...state,
			role: e.target.value,
		});
	};
	return (
		<div className="">
			<div className="space-y-6 bg-base-200 rounded-lg p-5">
				<div className="space-y-2">
					<h1 className="text-2xl font-bold">Invite users</h1>
					<p className="text-gray-500 dark:text-gray-400">
						Invite users to your team by email or by searching for existing users.
					</p>
				</div>
				<div>
					<h2 className="font-semibold">Pending invites</h2>
					<div className="grid grid-cols-3 gap-3">
						{orgInvites?.map((invite) => {
							return (
								<div className="border border-dashed border-gray-200 rounded-lg p-4 dark:border-gray-800">
									{/* Use justify-between to push the button to the far right */}
									<div className="flex items-center justify-between space-x-4">
										<div className="flex items-center space-x-2">
											{/* <img
												alt="Avatar for user"
												className="rounded-full"
												height="40"
												src="/placeholder.svg"
												style={{
													aspectRatio: "40/40",
													objectFit: "cover",
												}}
												width="40"
											/> */}
											<div>
												<h3 className="text-sm font-semibold">{invite.email}</h3>
												<p className="text-sm text-gray-500 dark:text-gray-400">
													{invite.role}
												</p>
											</div>
										</div>
										{/* This div is now correctly aligned to the right */}
										<button className="btn btn-primary btn-xs">Resend</button>
									</div>
								</div>
							);
						})}
					</div>
				</div>
				<div>
					<div className="space-y-6 ">
						<div className="form-control w-full">
							<h2 className=" font-semibold">Search for existing users</h2>
							<p className="text-sm text-gray-400">
								{t("organization.listOrganization.invitationModal.description")}
							</p>
							<label className="label">
								<span className="label-text">
									{t(
										"organization.listOrganization.invitationModal.inputFields.searchUser.title",
									)}
								</span>
							</label>
							<ScrollableDropdown
								items={allUsers}
								displayField="name"
								inputClassName="w-full"
								idField="id"
								placeholder={t(
									"organization.listOrganization.invitationModal.inputFields.searchUser.placeholder",
								)}
								onOptionSelect={(selectedItem) => {
									setState({
										...state,
										userId: selectedItem.id,
										name: selectedItem.name,
									});
								}}
							/>
						</div>
						<div className="form-control">
							<label className="label">
								<span className="label-text">
									{t(
										"organization.listOrganization.invitationModal.inputFields.userRole.title",
									)}
								</span>
							</label>
							<div className="form-control w-full max-w-xs">
								<select
									value={state?.role as string}
									onChange={(e) => dropDownHandler(e)}
									className="select select-sm select-bordered  select-ghost max-w-xs"
								>
									<option>ADMIN</option>
									<option>USER</option>
									<option>READ_ONLY</option>
								</select>
							</div>
						</div>
					</div>
				</div>
				<div className="divider">OR</div>
				<div>
					<p className="text-xl">Invite by mail</p>
					<InviteByMail organizationId={organizationId} />
				</div>
			</div>
		</div>
	);
};

Invites.getLayout = function getLayout(page: ReactElement) {
	return <LayoutOrganizationAuthenticated>{page}</LayoutOrganizationAuthenticated>;
};

export { getServerSideProps };

export default Invites;
