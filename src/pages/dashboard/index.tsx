import Head from "next/head";
import { type ReactElement } from "react";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import type { NextPageWithLayout } from "../_app";
import { globalSiteTitle } from "~/utils/global";
import { getServerSideProps } from "~/server/getServerSideProps";
import useOrganizationWebsocket from "~/hooks/useOrganizationWebsocket";

type OrganizationId = {
	id: string;
};
interface IProps {
	orgIds: OrganizationId[];
}

const Dashboard: NextPageWithLayout = ({ orgIds }: IProps) => {
	const title = `${globalSiteTitle} - Dashboard`;
	useOrganizationWebsocket(orgIds);

	return (
		<>
			<Head>
				<title>{title}</title>
				<link rel="icon" href="/favicon.ico" />
				<meta property="og:title" content={title} key={title} />
				<meta name="robots" content="noindex, nofollow" />
			</Head>
			<main className="my-10">
				<div className="mx-auto max-w-6xl space-y-10 bg-cover bg-center bg-no-repeat">
					{/* <div className="absolute inset-0 z-0">test </div> */}
					<div className="col-start-2 mx-0 flex justify-center text-2xl md:text-5xl">
						Welcome to {globalSiteTitle}
					</div>
					{/* grid with cards  */}
					<div className="mx-10 grid gap-5 md:grid-cols-[repeat(3,1fr)]">
						<div className="card bg-primary shadow-xl">
							<div className="card-body">
								<h2 className="card-title">Members</h2>
								<p>
									Connect team members from anywhere in the world on any device. ZeroTier
									creates secure networks between on-premise, cloud, desktop, and mobile
									devices.
								</p>
							</div>
						</div>
						<div className="card bg-primary shadow-xl">
							<div className="card-body">
								<h2 className="card-title">Everywhere</h2>
								<p>
									Connect Everywhere, Securely: ZeroTier, Your Global Network Solution
								</p>
							</div>
						</div>
						<div className="card bg-primary shadow-xl">
							<div className="card-body">
								<h2 className="card-title">Infinite Possibilities</h2>
								<p>Empowering Seamless Connections, Anywhere and Everywhere</p>
							</div>
						</div>
					</div>
				</div>
			</main>
		</>
	);
};

Dashboard.getLayout = function getLayout(page: ReactElement) {
	return <LayoutAuthenticated>{page}</LayoutAuthenticated>;
};

export { getServerSideProps };

export default Dashboard;
