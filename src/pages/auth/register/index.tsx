import { GetServerSideProps, GetServerSidePropsContext } from "next";
import { Session } from "next-auth";
import { getSession } from "next-auth/react";
import Head from "next/head";
import React, { ReactElement } from "react";
import { LayoutPublic } from "~/components/layouts/layout";
import RegisterForm from "~/components/auth/registerForm";
import { prisma } from "~/server/db";
import { globalSiteTitle } from "~/utils/global";
import { WelcomeMessage } from "~/components/auth/welcomeMessage";
import { useRouter } from "next/router";
import RegisterOrganizationInviteForm from "~/components/auth/registerOrganizationInvite";

const Register = () => {
	const title = `${globalSiteTitle} - Sign Up`;

	const router = useRouter();
	const { organizationInvite } = router.query as { organizationInvite?: string };
	return (
		<div>
			<Head>
				<title>{title}</title>
				<meta name="description" content="ZTNET User Registration" />
				<meta name="robots" content="noindex, nofollow" />
				<link rel="icon" href="/favicon.ico" />
			</Head>
			<main className="flex min-h-[calc(100vh-7vh)] flex-col m-5 sm:m-0">
				{/* Main section */}
				<div className="flex flex-grow items-center">
					<div className="mx-auto flex">
						<WelcomeMessage />
						{organizationInvite ? (
							<RegisterOrganizationInviteForm organizationInvite={organizationInvite} />
						) : (
							<RegisterForm />
						)}
					</div>
				</div>
			</main>
		</div>
	);
};

interface Props {
	auth?: Session["user"];
}

export const getServerSideProps: GetServerSideProps<Props> = async (
	context: GetServerSidePropsContext,
) => {
	const options = await prisma.globalOptions.findFirst({
		where: {
			id: 1,
		},
		select: {
			enableRegistration: true,
		},
	});

	// easy check to see if the invite probably is a jwt token
	const ztnetInvite = !!context.query?.invite && context.query?.invite.length > 50;
	const ztnetOrganizationInvite =
		!!context.query?.organizationInvite && context.query?.organizationInvite.length > 50;

	const session = await getSession(context);
	// redirect user to 404 if registration is disabled
	if (!options?.enableRegistration && !ztnetInvite && !ztnetOrganizationInvite) {
		return {
			redirect: {
				destination: "/404",
				permanent: false,
			},
		};
	}
	if (!session || !("user" in session)) {
		return { props: {} };
	}

	if (session.user && !ztnetOrganizationInvite) {
		return {
			redirect: {
				destination: "/network",
				permanent: false,
			},
		};
	}

	return {
		props: { auth: session.user },
	};
};

Register.getLayout = function getLayout(page: ReactElement) {
	return <LayoutPublic>{page}</LayoutPublic>;
};

export default Register;
