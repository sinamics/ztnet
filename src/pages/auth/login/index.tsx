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
import { useRouter } from "next/router";
import classNames from "classnames";
import { ErrorCode, getErrorMessage } from "~/utils/errorCode";

const Login = ({ title, oauthExclusiveLogin, oauthEnabled }) => {
	const currentYear = new Date().getFullYear();
	const { data: options, isLoading: loadingRegistration } =
		api.public.registrationAllowed.useQuery();
	const router = useRouter();
	const { query } = router;

	const errorCode = query.error as ErrorCode;
	const errorMessage = errorCode ? getErrorMessage(errorCode) : null;
	return (
		<>
			<Head>
				<title>{title}</title>
				<meta name="description" content="ZTNET - Zerotier Controller Web UI" />
				<meta name="robots" content="noindex, nofollow" />
				<link rel="icon" href="/favicon.ico" />
			</Head>

			<div
				className={classNames(
					"rounded-xl sm:border sm:p-12 space-y-5 w-full max-w-md mx-auto",
					{
						"border-red-500": !!errorMessage,
						"border-primary/50": !errorMessage,
					},
				)}
			>
				{errorMessage && (
					<div className="rounded">
						<span className="text-sm text-red-500">{errorMessage}</span>
					</div>
				)}
				<h3 className="text-xl font-semibold">Sign in to your account</h3>
				<div className="space-y-5">
					{!oauthExclusiveLogin && <CredentialsForm />}

					{oauthEnabled && (
						<div>
							{!oauthExclusiveLogin && <div className="divider">OR</div>}
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
	const oauthExclusiveLogin = process.env.OAUTH_EXCLUSIVE_LOGIN === "true";
	const oauthEnabled = !!process.env.OAUTH_ID && !!process.env.OAUTH_SECRET;

	const session = await getSession(context);
	if (!session || !session.user) {
		return { props: { oauthExclusiveLogin, oauthEnabled } };
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
