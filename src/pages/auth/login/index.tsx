import { type GetServerSideProps, type GetServerSidePropsContext } from "next";
import Head from "next/head";
import { type Session } from "next-auth";
import { getSession } from "next-auth/react";
import { ReactElement } from "react";
import { LayoutPublic } from "~/components/layouts/layout";
import OauthLogin from "~/components/auth/oauthLogin";
import CredentialsForm from "~/components/auth/credentialsForm";
import Link from "next/link";
import { api } from "~/utils/api";

const Login = ({ title, oauthExlusiveLogin, hasOauth }) => {
	const currentYear = new Date().getFullYear();
	const { data: options, isLoading: loadingRegistration } =
		api.public.registrationAllowed.useQuery();

	return (
		<>
			<Head>
				<title>{title}</title>
				<meta name="description" content="ZTNET - Zerotier Controller Web UI" />
				<meta name="robots" content="noindex, nofollow" />
				<link rel="icon" href="/favicon.ico" />
			</Head>

			<div className="rounded-xl sm:border border-primary/50 sm:p-12 space-y-5 w-full">
				<h3 className="text-xl font-semibold">Sign in to your account</h3>

				<div className="space-y-5">
					{!oauthExlusiveLogin && <CredentialsForm />}

					{hasOauth && (
						<div>
							{!oauthExlusiveLogin && <div className="divider">OR</div>}
							<OauthLogin />
						</div>
					)}
					{options?.enableRegistration && !loadingRegistration ? (
						<div className="pt-5">
							<p className="mb-4">Don't have an account?</p>
							<Link href="/auth/register" className="underline">
								Get Started!
							</Link>
						</div>
					) : null}

					<div className="pt-5 text-center text-xs text-gray-400">
						<span>Copyright © {currentYear} Kodea Solutions</span>
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
