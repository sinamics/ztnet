import { GetServerSideProps, GetServerSidePropsContext } from "next";
import { Session } from "next-auth";
import { getSession } from "next-auth/react";
import Head from "next/head";
import React, { ReactElement } from "react";
import { LayoutPublic } from "~/components/layouts/layout";
import RegisterForm from "~/components/auth/registerForm";
import { prisma } from "~/server/db";
import { useRouter } from "next/router";
import RegisterOrganizationInviteForm from "~/components/auth/registerOrganizationInvite";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { api } from "~/utils/api";

const Register = () => {
	const { data: globalOptions } = api.settings.getPublicOptions.useQuery();
	const title = `${globalOptions?.siteName} - Sign Up`;

	const t = useTranslations();
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
			<div className="rounded-xl sm:border border-primary/50 sm:p-12 space-y-5 w-full">
				<h3 className="text-xl font-semibold">
					{t("authPages.signup.signUpWithCredentials")}
				</h3>
				{organizationInvite ? (
					<RegisterOrganizationInviteForm organizationInvite={organizationInvite} />
				) : (
					<RegisterForm />
				)}
				<div className="pt-5">
					<p className="mb-4">{t("authPages.signup.haveAnAccount")}</p>
					<Link href="/auth/login" className="underline">
						{t("authPages.signup.login")}
					</Link>
				</div>
				<div className="pt-5 text-center text-xs text-gray-400">
					<span>Copyright © {new Date().getFullYear()} Kodea Solutions</span>
				</div>
			</div>
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

	if (!session || !("user" in session) || !session.user) {
		return {
			props: {
				messages: (await import(`~/locales/${context.locale}/common.json`)).default,
			},
		};
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
		props: {
			auth: session.user,
			messages: (await import(`~/locales/${context.locale}/common.json`)).default,
		},
	};
};

Register.getLayout = function getLayout(page: ReactElement) {
	return <LayoutPublic>{page}</LayoutPublic>;
};

export default Register;
