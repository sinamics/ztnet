import { GetServerSideProps, GetServerSidePropsContext } from "next";
import { Session } from "next-auth";
import { getSession } from "next-auth/react";
import Head from "next/head";
import React, { ReactElement } from "react";
import ForgotPasswordForm from "~/components/auth/forgotPasswordForm";
import { WelcomeMessage } from "~/components/auth/welcomeMessage";
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
			<main className="flex min-h-screen flex-col m-5 sm:m-0">
				{/* Main section */}
				<div className="flex flex-grow items-center">
					<div className="mx-auto flex">
						<WelcomeMessage />
						<ForgotPasswordForm />
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
	const session = await getSession(context);
	if (!session || !("user" in session)) {
		return { props: {} };
	}

	if (session.user) {
		return {
			redirect: {
				destination: "/dashboard",
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
