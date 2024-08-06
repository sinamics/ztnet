import { type GetServerSideProps, type GetServerSidePropsContext } from "next";
import Head from "next/head";
import { type Session } from "next-auth";
import { getSession } from "next-auth/react";
import { ReactElement } from "react";
import { globalSiteTitle } from "~/utils/global";
import { LayoutPublic } from "~/components/layouts/layout";
import OauthLogin from "~/components/auth/oauthLogin";
import CredentialsForm from "~/components/auth/credentialsForm";

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

			<div className="z-10 flex justify-center self-center">
				<div className="w-100 mx-auto rounded-2xl border border-primary p-12">
					<div className="mb-4">
						<h3 className="text-xl font-semibold">Sign in to your account</h3>
					</div>
					<div className="space-y-5">
						{!oauthExlusiveLogin ? <CredentialsForm /> : null}
						{hasOauth ? (
							<div>
								<div className="divider divider-error">OR</div>
								<OauthLogin />
							</div>
						) : null}
						<div className="pt-5 text-center text-xs text-gray-400">
							<span>Copyright © {new Date().getFullYear()} Kodea Solutions</span>
						</div>
					</div>
				</div>
			</div>
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
