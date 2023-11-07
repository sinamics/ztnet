import { type GetServerSideProps, type GetServerSidePropsContext } from "next";
import Head from "next/head";
import { type Session } from "next-auth";
import { getSession } from "next-auth/react";
import { ReactElement } from "react";
import { globalSiteTitle } from "~/utils/global";
import { LayoutPublic } from "~/components/layouts/layout";
import LoginForm from "~/components/auth/loginForm";
import { WelcomeMessage } from "~/components/auth/welcomeMessage";

const Login = () => {
	const title = `${globalSiteTitle} - Sign In`;
	return (
		<>
			<Head>
				<title>{title}</title>
				<meta name="description" content="ZTNET - Zerotier Controller Web UI" />
				<link rel="icon" href="/favicon.ico" />
			</Head>
			<main className="flex min-h-[calc(100vh-7vh)] flex-col">
				{/* Main section */}
				<div className="flex flex-grow items-center">
					<div className="mx-auto flex">
						<WelcomeMessage />
						<LoginForm />
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
	const session = await getSession(context);
	// const messages = (await import(`~/locales/${context.locale}/common.json`)).default;

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

Login.getLayout = function getLayout(page: ReactElement) {
	return <LayoutPublic>{page}</LayoutPublic>;
};

export default Login;
