import Head from "next/head";
import type { ReactElement } from "react";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import type { NextPageWithLayout } from "../_app";
import { api } from "~/utils/api";
import { NetworkTable } from "../../components/networkPage/networkTable";
import { globalSiteTitle } from "~/utils/global";
import { useTranslations } from "next-intl";
import { type GetServerSidePropsContext } from "next";
import toast from "react-hot-toast";
import { ErrorData } from "~/types/errorHandling";
import { withAuth } from "~/components/auth/withAuth";
import { useRouter } from "next/router";

const title = `${globalSiteTitle} - Local Controller`;

const HeadSection = () => (
	<Head>
		<title>{title}</title>
		<link rel="icon" href="/favicon.ico" />
		<meta property="og:title" content={title} key={title} />
		<meta name="robots" content="nofollow" />
	</Head>
);

const Organizations: NextPageWithLayout = () => {
	const t = useTranslations("networks");
	const query = useRouter().query;
	console.log(query);
	const { data: userOrgs, isLoading, refetch } = api.org.getOrg.useQuery();

	if (isLoading) {
		// add loading progress bar to center of page, vertially and horizontally
		return (
			<>
				<HeadSection />
				<div className="flex flex-col items-center justify-center">
					<h1 className="text-center text-2xl font-semibold">
						<progress className="progress progress-primary w-56" />
					</h1>
				</div>
			</>
		);
	}

	return (
		<>
			<HeadSection />
			<main className="w-full bg-base-100">Organization</main>
		</>
	);
};

Organizations.getLayout = function getLayout(page: ReactElement) {
	return <LayoutAuthenticated>{page}</LayoutAuthenticated>;
};
export const getServerSideProps = withAuth(async (context: GetServerSidePropsContext) => {
	return {
		props: {
			// You can get the messages from anywhere you like. The recommended
			// pattern is to put them in JSON files separated by locale and read
			// the desired one based on the `locale` received from Next.js.
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			messages: (await import(`../../locales/${context.locale}/common.json`)).default,
		},
	};
});
export default Organizations;
