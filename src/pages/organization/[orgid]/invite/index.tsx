import { useTranslations } from "next-intl";
import { useRouter } from "next/router";
import { ReactElement } from "react";
import toast from "react-hot-toast";
import { LayoutOrganizationAuthenticated } from "~/components/layouts/layout";
import InviteByMail from "~/components/organization/inviteByMail";
import InviteByUser from "~/components/organization/inviteByUser";
import { getServerSideProps } from "~/server/getServerSideProps";
import { api } from "~/utils/api";
import TimeAgo from "react-timeago";

const Invites = () => {
	const b = useTranslations("commonButtons");
	const router = useRouter();
	const organizationId = router.query.orgid as string;

	const { data: orgInvites, refetch: refetchInvites } = api.org.getInvites.useQuery({
		organizationId,
	});
	const { mutate: resendInvite } = api.org.resendInvite.useMutation({
		onSuccess: () => {
			refetchInvites();
			toast.success("Invitation resent successfully");
		},
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
					<h1 className="text-2xl font-bold">Team Expansion: Invite New Members</h1>
					<p className="text-gray-400">
						Invite more people to your team! You can send invitations by email or find and
						add people who are already using the platform.
						<br /> This makes it easy for your team to grow and include more members.
					</p>
				</div>
				<div className="grid grid-cols-[1fr,auto,1fr] gap-3">
					<InviteByMail organizationId={organizationId} />
					<div className="divider divider-horizontal">OR</div>
					<InviteByUser />
				</div>
				<div>
					{orgInvites?.length > 0 ? (
						<div className="divider pt-10">Pending Invites</div>
					) : null}
					<div className="grid grid-cols-3 gap-3">
						{orgInvites?.map((invite) => {
							const resendLimit =
								new Date(invite.mailSentAt) > new Date(Date.now() - 1 * 60 * 1000) ||
								!invite.mailSentAt;
							return (
								<div className="border border-dashed border-gray-200 rounded-lg p-4 dark:border-gray-800 bg-primary/10 shadow-md cursor-pointer">
									<div className="flex items-center justify-between space-x-4">
										<div className="flex items-center space-x-2">
											<div>
												<h3 className="text-sm font-semibold">{invite.email}</h3>
												<p className="text-sm text-gray-500 dark:text-gray-400">
													{invite.role}
												</p>
											</div>
										</div>
									</div>
									<div className="flex justify-end gap-3">
										<button
											// set disabled if invite.mailsentAt is less than 5min ago
											// or if invite.mailsentAt is null
											title="Resend invitation email"
											disabled={resendLimit}
											onClick={() =>
												resendInvite({ invitationId: invite.id, organizationId })
											}
											className="btn btn-primary btn-xs"
										>
											{resendLimit ? (
												<TimeAgo
													date={
														new Date(new Date(invite.mailSentAt).getTime() + 1 * 60000)
													}
												/>
											) : (
												"Resend"
											)}
										</button>
										<button
											onClick={() =>
												deleteInvite({ invitationId: invite.id, organizationId })
											}
											className="btn btn-xs"
										>
											{b("delete")}
										</button>
									</div>
								</div>
							);
						})}
					</div>
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
