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
				<meta name="robots" content="nofollow" />
			</Head>
			<main className="flex min-h-screen flex-col">
				{/* Main section */}
				<div className="flex flex-grow items-center">
					<div className="mx-auto flex">
						<div className="z-10 sm:max-w-2xl md:p-10 xl:max-w-2xl">
							<div className="hidden flex-col self-start text-white lg:flex">
								{/* <img src="" className="mb-3" /> */}
								<div className="md:mb-10">
									<h1 className="mb-3  text-5xl font-bold">Hi, Welcome</h1>
								</div>
								<p className="pr-3">
									ZeroTier VPN is your key to boundless connectivity and ultimate privacy.
									Experience a secure and borderless digital world, free from limitations.
									Empower yourself with unmatched performance, while safeguarding your
									data.
								</p>
							</div>
						</div>
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
	const messages = (await import(`~/locales/${context.locale}/common.json`)).default;

	if (!session || !("user" in session)) {
		return { props: { messages } };
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
		props: { auth: session.user, messages },
	};
};

ForgotPassword.getLayout = function getLayout(page: ReactElement) {
	return <LayoutPublic>{page}</LayoutPublic>;
};

export default ForgotPassword;
