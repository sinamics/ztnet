import { GetServerSideProps, GetServerSidePropsContext } from "next";
import { Session } from "next-auth";
import { getSession } from "next-auth/react";
import Head from "next/head";
import React, { ReactElement } from "react";
import ForgotPasswordForm from "~/components/auth/forgotPasswordForm";
import { LayoutPublic } from "~/components/layouts/layout";
import { globalSiteTitle } from "~/utils/global";

const ForgotPassword = () => {
	const title = `${globalSiteTitle} - Forgot Password`;
	return (
		<div>
			<Head>
				<title>{title}</title>
				<link rel="icon" href="/favicon.ico" />
				<meta name="robots" content="noindex, nofollow" />
			</Head>
			<ForgotPasswordForm />
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
	if (!session || !("user" in session)) {
		return { props: {} };
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
		props: { auth: session.user },
	};
};

ForgotPassword.getLayout = function getLayout(page: ReactElement) {
	return <LayoutPublic>{page}</LayoutPublic>;
};

export default ForgotPassword;
