import { useRouter } from "next/router";
import { api } from "~/utils/api";
import { Session } from "next-auth";
import { toast } from "react-hot-toast";
import Head from "next/head";
import { globalSiteTitle } from "~/utils/global";
import { ErrorCode } from "~/utils/errorCode";
import { useTranslations } from "next-intl";
import { GetServerSideProps, GetServerSidePropsContext } from "next";
import { getSession } from "next-auth/react";
import { useState, useEffect } from "react";

const VerifyEmail = () => {
	const t = useTranslations();
	const router = useRouter();
	const { token } = router.query;
	const [redirectCountdown, setRedirectCountdown] = useState(5);

	const { data: tokenData, isLoading: validateTokenLoading } =
		api.auth.validateEmailVerificationToken.useQuery(
			{
				token: token as string,
			},
			{
				enabled: !!token,
				onSuccess: (response) => {
					if (response?.error) {
						switch (response.error) {
							case ErrorCode.InvalidToken:
								void router.push("/auth/login");
								break;
							case ErrorCode.TooManyRequests:
								toast.error("Too many requests, please try again later");
								break;
							default:
								toast.error(response.error);
						}
					}
				},
				onError: (error) => {
					toast.error(error.message);
				},
			},
		);

	useEffect(() => {
		if (!validateTokenLoading && tokenData && !tokenData.error) {
			const timer = setInterval(() => {
				setRedirectCountdown((prev) => {
					if (prev <= 1) {
						clearInterval(timer);
						void router.push("/user-settings/?tab=account");
					}
					return prev - 1;
				});
			}, 1000);

			return () => clearInterval(timer);
		}
	}, [validateTokenLoading, tokenData, router]);

	const title = `${globalSiteTitle} - VerifyEmail`;

	if (validateTokenLoading || !tokenData) {
		return null;
	}

	return (
		<div>
			<Head>
				<title>{title}</title>
				<link rel="icon" href="/favicon.ico" />
				<meta name="robots" content="noindex, nofollow" />
			</Head>
			<div className="z-10 flex h-screen w-screen items-center justify-center">
				<div className="w-100 mx-auto rounded-2xl border border-1 border-primary p-12">
					<div className="mb-4">
						<h3 className="text-2xl font-semibold text-center mb-4">
							{tokenData.error ? "Error" : "Email Verified"}
						</h3>
						<p className="text-gray-500 text-center">
							{tokenData.error
								? t("authPages.mfaRecoveryReset.mfaRecoveryResetMessage")
								: "Your email has been successfully verified."}
						</p>
						{!tokenData.error && (
							<p className="text-gray-500 text-center mt-4">
								You will be redirected automatically in {redirectCountdown} seconds.
							</p>
						)}
					</div>
					{!tokenData.error && (
						<div className="mt-6 text-center">
							<button
								onClick={() => void router.push("/user-settings/?tab=account")}
								className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors"
							>
								Go Now
							</button>
						</div>
					)}
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

	return {
		props: { auth: session.user },
	};
};

export default VerifyEmail;
