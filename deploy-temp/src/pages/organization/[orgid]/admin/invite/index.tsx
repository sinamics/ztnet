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
import HeadSection from "~/components/shared/metaTags";
import MenuSectionDividerWrapper from "~/components/shared/menuSectionDividerWrapper";

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
		// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
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
				"border border-dashed border-gray-200 rounded-lg p-4 dark:border-gray-800 bg-primary/10 shadow-md",
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
	const t = useTranslations();
	const router = useRouter();
	const organizationId = router.query.orgid as string;
	const { data: globalOptions } = api.settings.getAllOptions.useQuery();
	const { data: orgInvites } = api.org.getInvites.useQuery({
		organizationId,
	});

	const pageTitle = `${globalOptions?.siteName} - Invitations`;
	return (
		<main className="flex w-full flex-col space-y-5 justify-center bg-base-100 p-5 sm:p-3">
			<HeadSection title={pageTitle} />
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
				<div className="space-y-10">
					<MenuSectionDividerWrapper title={t("commonMenuTiles.invites")}>
						<InviteByMail organizationId={organizationId} />
					</MenuSectionDividerWrapper>
					<MenuSectionDividerWrapper title={t("commonMenuTiles.invites")}>
						<InviteByUser />
					</MenuSectionDividerWrapper>
				</div>
				<div>
					<MenuSectionDividerWrapper title={t("commonMenuTiles.pendingInvites")}>
						{orgInvites?.map((invite) => (
							<InviteCard
								key={invite.id}
								invite={invite}
								organizationId={organizationId}
							/>
						))}
					</MenuSectionDividerWrapper>
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
