import Head from "next/head";
import type { ReactElement } from "react";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import type { NextPageWithLayout } from "../_app";
import { api } from "~/utils/api";
import { CentralNetworkTable } from "../../components/networkPage/centralNetworkTable";
import { globalSiteTitle } from "~/utils/global";
import { useTranslations } from "next-intl";
import { getServerSideProps } from "~/server/getServerSideProps";

const title = `${globalSiteTitle} - Zerotier Central`;

const HeadSection = () => (
	<Head>
		<title>{title}</title>
		<link rel="icon" href="/favicon.ico" />
		<meta property="og:title" content={title} key={title} />
		<meta name="robots" content="noindex, nofollow" />
	</Head>
);

const CentralNetworks: NextPageWithLayout = () => {
	const b = useTranslations("commonButtons");
	const t = useTranslations("networks");
	const {
		data: centralNetworks,
		isLoading,
		refetch,
	} = api.network.getUserNetworks.useQuery({
		central: true,
	});

	const { mutate: createNetwork } = api.network.createNetwork.useMutation();
	const addNewNetwork = () => {
		createNetwork({ central: true }, { onSuccess: () => void refetch() });
	};

	if (isLoading) {
		// add loading progress bar to center of page, vertially and horizontally
		return (
			<>
				<HeadSection />
				<div className="flex flex-col items-center justify-center">
					<h1 className="text-center text-2xl font-semibold">
						<progress className="progress progress-primary w-56"></progress>
					</h1>
				</div>
			</>
		);
	}

	return (
		<>
			<HeadSection />
			<main className="w-full bg-base-100">
				<div className="mb-3 mt-3 flex w-full justify-center ">
					<h5 className="w-full text-center text-2xl">ZT Central Networks</h5>
				</div>
				<div className="grid grid-cols-1 space-y-3 px-3 pt-5 md:grid-cols-[1fr,1fr,1fr] md:space-y-0 md:px-11">
					<div className="flex justify-center">
						<button className={"btn btn-primary btn-outline"} onClick={addNewNetwork}>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								strokeWidth="1.5"
								stroke="currentColor"
								className="mr-2 h-6 w-6"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M12 4.5v15m7.5-7.5h-15"
								/>
							</svg>
							{b("addNetwork")}
						</button>
					</div>
					<div className="col-span-2">
						{centralNetworks && centralNetworks.length > 0 && (
							<CentralNetworkTable tableData={centralNetworks} />
						)}
						{!centralNetworks ||
							(centralNetworks.length === 0 && (
								<div className="alert alert-warning">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="h-6 w-6 shrink-0 stroke-current"
										fill="none"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
										/>
									</svg>
									<span>{t("noNetworksMessage")}</span>
								</div>
							))}
					</div>
				</div>
			</main>
		</>
	);
};

CentralNetworks.getLayout = function getLayout(page: ReactElement) {
	return <LayoutAuthenticated>{page}</LayoutAuthenticated>;
};
export { getServerSideProps };
export default CentralNetworks;
