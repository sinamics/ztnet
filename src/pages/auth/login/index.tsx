import type { GetServerSideProps, GetServerSidePropsContext } from "next";
import Head from "next/head";
import type { Session } from "next-auth";
import { getSession } from "next-auth/react";
import type { ReactElement } from "react";
import { globalSiteTitle } from "~/utils/global";
import { LayoutPublic } from "~/components/layouts/layout";
import LoginForm from "~/components/auth/loginForm";
import { WelcomeMessage } from "~/components/auth/welcomeMessage";

const Login = ({ hasOauth, hasAzureAD, oauthExlusiveLogin}) => {
	const title = `${globalSiteTitle} - Sign In`;

	return (
		<>
			<Head>
				<title>{title}</title>
				<meta name="description" content="ZTNET - Zerotier Controller Web UI" />
				<meta name="robots" content="noindex, nofollow" />
				<link rel="icon" href="/favicon.ico" />
			</Head>
			<main className="flex min-h-[calc(100vh-7vh)] flex-col">
				{/* Main section */}
				<div className="flex flex-grow items-center m-5 sm:m-0">
					<div className="mx-auto flex">
						<WelcomeMessage />
						<LoginForm hasOauth={hasOauth} hasAzureAD={hasAzureAD} oauthExlusiveLogin={oauthExlusiveLogin}/>
					</div>
				</div>
			</main>
		</>
	);
};

interface Props {
	auth?: Session["user"];
}

export const getServerSideProps: GetServerSideProps<Props> = async (
	context: GetServerSidePropsContext,
) => {
	const hasOauth = !!(process.env.OAUTH_ID && process.env.OAUTH_SECRET);
	const hasAzureAD = !!(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET && process.env.AZURE_AD_TENANT_ID);
	const oauthExlusiveLogin = process.env.OAUTH_EXCLUSIVE_LOGIN === "true";

	const session = await getSession(context);
	if (!session || !session.user) {
		return { props: { hasOauth, hasAzureAD, oauthExlusiveLogin } };
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

Login.getLayout = function getLayout(page: ReactElement) {
	return <LayoutPublic>{page}</LayoutPublic>;
};

export default Login;
