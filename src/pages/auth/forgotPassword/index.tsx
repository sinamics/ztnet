import { GetServerSideProps, GetServerSidePropsContext } from "next";
import { Session } from "next-auth";
import { getSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import Head from "next/head";
import Link from "next/link";
import React, { ReactElement } from "react";
import ForgotPasswordForm from "~/components/auth/forgotPasswordForm";
import { LayoutPublic } from "~/components/layouts/layout";
import { globalSiteTitle } from "~/utils/global";

const ForgotPassword = () => {
	const t = useTranslations();
	const title = `${globalSiteTitle} - Forgot Password`;
	return (
		<div>
			<Head>
				<title>{title}</title>
				<link rel="icon" href="/favicon.ico" />
				<meta name="robots" content="noindex, nofollow" />
			</Head>

			<div className="rounded-xl sm:border border-primary/50 sm:p-12 space-y-5 w-full">
				<h3 className="text-xl font-semibold">
					{t("authPages.forgot.forgotPasswordTitle")}
				</h3>
				<div className="mb-4">
					<p className="text-gray-500">{t("authPages.forgot.forgotPasswordMessage")}</p>
					<div className="space-y-5"></div>
					<ForgotPasswordForm />
					<div className="pt-5">
						<Link href="/auth/login" className="underline">
							{t("authPages.forgot.backToLogin")}
						</Link>
					</div>
					<div className="pt-5 text-center text-xs text-gray-400">
						<span>Copyright © {new Date().getFullYear()} Kodea Solutions</span>
					</div>
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
	const session = await getSession(context);
	if (!session || !("user" in session) || !session.user) {
		return {
			props: {
				messages: (await import(`~/locales/${context.locale}/common.json`)).default,
			},
		};
	}

	if (session.user) {
		return {
			redirect: {
				destination: "/network",
				permanent: false,
			},
		};
	}

	return {
		props: {
			auth: null,
		},
	};
};

ForgotPassword.getLayout = function getLayout(page: ReactElement) {
	return <LayoutPublic>{page}</LayoutPublic>;
};

export default ForgotPassword;
