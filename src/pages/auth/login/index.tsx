import { type GetServerSideProps, type GetServerSidePropsContext } from "next";
import Head from "next/head";
import { type Session } from "next-auth";
import { getSession } from "next-auth/react";
import { ReactElement } from "react";
import { globalSiteTitle } from "~/utils/global";
import { LayoutPublic } from "~/components/layouts/layout";
import LoginForm from "~/components/auth/loginForm";

const Login = ({ hasOauth, oauthExlusiveLogin }) => {
	const title = `${globalSiteTitle} - Sign In`;

	return (
		<>
			<Head>
				<title>{title}</title>
				<meta name="description" content="ZTNET - Zerotier Controller Web UI" />
				<meta name="robots" content="noindex, nofollow" />
				<link rel="icon" href="/favicon.ico" />
			</Head>
			<LoginForm hasOauth={hasOauth} oauthExlusiveLogin={oauthExlusiveLogin} />
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
	const oauthExlusiveLogin = process.env.OAUTH_EXCLUSIVE_LOGIN === "true";

	const session = await getSession(context);
	if (!session || !session.user) {
		return { props: { hasOauth, oauthExlusiveLogin } };
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
