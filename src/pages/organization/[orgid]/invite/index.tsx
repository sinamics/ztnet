import { useRouter } from "next/router";
import { ReactElement } from "react";
import { LayoutOrganizationAuthenticated } from "~/components/layouts/layout";
import InviteByMail from "~/components/organization/inviteByMail";
import InviteByUser from "~/components/organization/inviteByUser";
import { getServerSideProps } from "~/server/getServerSideProps";
import { api } from "~/utils/api";

const Invites = () => {
	const router = useRouter();
	const organizationId = router.query.orgid as string;

	const { data: orgInvites, refetch: refetchInvites } = api.org.getInvites.useQuery({
		organizationId,
	});
	const { mutate: deleteInvite } = api.org.deleteInvite.useMutation({
		onSuccess: () => {
			refetchInvites();
		},
	});
	return (
		<div className="">
			<div className="space-y-5 bg-base-200 rounded-lg p-5">
				<div className="space-y-2">
					<h1 className="text-2xl font-bold">Invite users</h1>
					<p className="text-gray-500 dark:text-gray-400">
						Invite users to your team by email or by searching for existing users.
					</p>
				</div>
				<div>
					{orgInvites.length > 0 ? (
						<h2 className="font-semibold">Pending invites by email</h2>
					) : null}
					<div className="grid grid-cols-3 gap-3">
						{orgInvites?.map((invite) => {
							return (
								<div className="border border-dashed border-gray-200 rounded-lg p-4 dark:border-gray-800 bg-primary/10 shadow-md cursor-pointer">
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
									</div>
									<div className="flex justify-end gap-3">
										<button className="btn btn-primary btn-xs">Resend</button>
										<button
											onClick={() =>
												deleteInvite({ invitationId: invite.id, organizationId })
											}
											className="btn btn-xs"
										>
											Delete
										</button>
									</div>
								</div>
							);
						})}
					</div>
				</div>
				<div className="grid grid-cols-[1fr,auto,1fr] gap-3">
					<InviteByMail organizationId={organizationId} />
					<div className="divider divider-horizontal">OR</div>
					<InviteByUser />
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
