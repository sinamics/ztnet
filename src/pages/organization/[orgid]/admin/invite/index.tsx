import { useTranslations } from "next-intl";
import { useRouter } from "next/router";
import { ReactElement, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { LayoutOrganizationAuthenticated } from "~/components/layouts/layout";
import InviteByMail from "~/components/organization/inviteByMail";
import InviteByUser from "~/components/organization/inviteByUser";
import { getServerSideProps } from "~/server/getServerSideProps";
import { api } from "~/utils/api";
import TimeAgo from "react-timeago";
import cn from "classnames";
import { globalSiteTitle } from "~/utils/global";
import HeadSection from "~/components/shared/metaTags";

const ExpiryCountdown = ({ date, onExpire }) => {
	const b = useTranslations("commonButtons");
	const calculateTimeLeft = () => {
		const expiryDate = new Date(date).getTime();
		const now = Date.now();
		const difference = expiryDate - now;
		return Math.max(0, Math.floor(difference / 1000));
	};

	const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

	useEffect(() => {
		if (timeLeft <= 0) {
			onExpire();
			return;
		}

		// Sets up the countdown interval.
		const intervalId = setInterval(() => {
			const newTimeLeft = calculateTimeLeft();
			if (newTimeLeft <= 0) {
				clearInterval(intervalId);
				onExpire();
			}
			setTimeLeft(newTimeLeft);
		}, 1000);

		return () => clearInterval(intervalId);
	}, [timeLeft, onExpire, calculateTimeLeft]);

	return timeLeft <= 0 ? <span>{b("resend")}</span> : <span>{timeLeft} seconds</span>;
};

const InviteCard = ({ invite, organizationId }) => {
	const [resendable, setResendable] = useState(false);
	const b = useTranslations("commonButtons");
	const { refetch: refetchInvites } = api.org.getInvites.useQuery({
		organizationId,
	});

	const { mutate: resendInvite, isLoading: resendLoading } =
		api.org.resendInvite.useMutation({
			onSuccess: () => {
				refetchInvites();
				setResendable(false);
				toast.success("Invitation resent successfully");
			},
		});

	const { mutate: deleteInvite } = api.org.deleteInvite.useMutation({
		onSuccess: () => {
			refetchInvites();
		},
	});

	useEffect(() => {
		setResendable(invite.resendable);
	}, [invite.resendable]);

	const resendTimeLimit = new Date(
		new Date(invite.invitation.mailSentAt).getTime() + 60000,
	);
	return (
		<div
			className={cn(
				"border border-dashed border-gray-200 rounded-lg p-4 dark:border-gray-800 bg-primary/10 shadow-md cursor-pointer",
				{ "bg-red-500/30": invite.hasExpired },
			)}
		>
			<div className="flex justify-between space-x-2">
				<div>
					<h3 className="text-sm font-semibold">{invite.invitation.email}</h3>
					<p className="text-sm text-gray-500 dark:text-gray-400">
						{invite.invitation.role}
					</p>
				</div>
				<p className="text-sm">
					{invite.hasExpired ? (
						"EXPIRED"
					) : (
						<span>
							Expires: <TimeAgo date={invite.invitation.expiresAt} />
						</span>
					)}
				</p>
			</div>
			<div className="flex justify-end gap-3">
				<button
					// set disabled if invite.mailsentAt is less than 5min ago
					// or if invite.mailsentAt is null
					title="Resend invitation email"
					disabled={!resendable || resendLoading}
					onClick={() => resendInvite({ invitationId: invite.id, organizationId })}
					className="btn btn-primary btn-xs"
				>
					<ExpiryCountdown
						key={invite.invitation.mailSentAt}
						date={resendTimeLimit}
						onExpire={() => setResendable(true)}
					/>
				</button>
				<button
					onClick={() => deleteInvite({ invitationId: invite.id, organizationId })}
					className="btn btn-xs"
				>
					{b("delete")}
				</button>
			</div>
		</div>
	);
};

const OrganizationInvites = () => {
	const t = useTranslations("organization");
	const router = useRouter();
	const organizationId = router.query.orgid as string;

	const { data: orgInvites } = api.org.getInvites.useQuery({
		organizationId,
	});

	const pageTitle = `${globalSiteTitle} - Invitations`;
	return (
		<main className="flex w-full flex-col space-y-5 justify-center bg-base-100 p-3">
			<HeadSection title={pageTitle} />
			{/* <div className="space-y-2">
				<h1 className="text-sm font-bold">{t("invitation.title")}</h1>
				<p className="text-sm text-gray-400">
					{t.rich("invitation.description", {
						br: () => <br />,
					})}
				</p>
			</div> */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
				<div className="rounded-lg space-y-10">
					<div>
						<p className="text-[0.7rem] text-gray-400 uppercase">Invites</p>
						<div className="divider mt-0 p-0 text-gray-500"></div>

						<InviteByMail organizationId={organizationId} />
					</div>
					<div>
						<InviteByUser />
						{/* <div className="grid grid-cols-1 lg:grid-cols-[1fr,auto,1fr] gap-3">
						<InviteByMail organizationId={organizationId} />
						<div className="divider divider-horizontal hidden lg:inline-flex">OR</div>
						<div className="divider lg:hidden">OR</div>
						<InviteByUser />
						</div> */}
					</div>
				</div>
				<div>
					<p className="text-[0.7rem] text-gray-400 uppercase">Pending Invites</p>
					<div className="divider mt-0 p-0 text-gray-500"></div>
					{orgInvites?.length > 0 ? (
						<div className="divider pt-10">
							{t("invitation.pendingInvitations.title")}
						</div>
					) : null}
					<div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-3">
						{orgInvites?.map((invite) => (
							<InviteCard
								key={invite.id}
								invite={invite}
								organizationId={organizationId}
							/>
						))}
					</div>
				</div>
			</div>
		</main>
	);
};

OrganizationInvites.getLayout = function getLayout(page: ReactElement) {
	return <LayoutOrganizationAuthenticated>{page}</LayoutOrganizationAuthenticated>;
};

export { getServerSideProps };

export default OrganizationInvites;
