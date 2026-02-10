import { GetServerSideProps, GetServerSidePropsContext } from "next";
import { Session } from "next-auth";
import { getSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import Head from "next/head";
import Link from "next/link";
import React, { ReactElement } from "react";
import MfaRecoveryForm from "~/components/auth/mfaRecoveryForm";
import { LayoutPublic } from "~/components/layouts/layout";
import { api } from "~/utils/api";

const MfaRecovery = () => {
	const t = useTranslations();

	const { data: globalOptions } = api.settings.getPublicOptions.useQuery();

	const title = `${globalOptions?.siteName} - Forgot Password`;
	return (
		<div>
			<Head>
				<title>{title}</title>
				<link rel="icon" href="/favicon.ico" />
				<meta name="robots" content="noindex, nofollow" />
			</Head>
			<div className="z-10 flex justify-center self-center">
				<div className="w-100 mx-auto rounded-2xl border border-primary p-12">
					<div className="mb-4">
						<h3 className="text-xl font-semibold">
							{t("authPages.mfaRecovery.mfaRecoveryTitle")}
						</h3>
						<p className="text-gray-500">
							{t("authPages.mfaRecovery.mfaRecoveryMessage")}
						</p>
					</div>
					<MfaRecoveryForm />
					<div className="pt-5">
						<Link href="/auth/login" className="underline">
							{t("authPages.mfaRecovery.backToLogin")}
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
		props: { auth: session.user },
	};
};

MfaRecovery.getLayout = function getLayout(page: ReactElement) {
	return <LayoutPublic>{page}</LayoutPublic>;
};

export default MfaRecovery;
