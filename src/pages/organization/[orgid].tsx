import { useRouter } from "next/router";
import { type ReactElement } from "react";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import { api } from "~/utils/api";
import { GetServerSidePropsContext } from "next/types";
import { withAuth } from "~/components/auth/withAuth";
import { getSession } from "next-auth/react";
import { OrganizationNetworkTable } from "~/components/organization/networkTable";

const OrganizationById = () => {
	const query = useRouter().query;
	const orgId = query.orgid as string;
	const { data: orgData } = api.org.getOrgById.useQuery({
		orgId,
	});
	const { mutate: createNetwork } = api.org.createOrgNetwork.useMutation();

	return (
		<main className="w-full bg-base-100">
			<div className="mb-3 mt-3 flex w-full justify-center ">
				<h5 className="w-full text-center text-2xl">{orgData?.orgName}</h5>
			</div>
			<div className="grid grid-cols-1 space-y-3 px-3 pt-5 md:grid-cols-[1fr,1fr,1fr] md:space-y-0 md:px-11">
				<div className="flex justify-center">
					<button
						className={"btn btn-primary btn-outline"}
						onClick={() => createNetwork({ orgId, orgName: orgData?.orgName })}
					>
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
						add network
					</button>
				</div>
				<div className="col-span-2">
					{orgData?.networks && orgData.networks.length > 0 && (
						<OrganizationNetworkTable tableData={orgData.networks} />
					)}
					{!orgData?.networks ||
						(orgData.networks.length === 0 && (
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
								<span>No Networks</span>
							</div>
						))}
				</div>
			</div>
		</main>
	);
};

OrganizationById.getLayout = function getLayout(page: ReactElement) {
	return <LayoutAuthenticated>{page}</LayoutAuthenticated>;
};

export const getServerSideProps = withAuth(async (context: GetServerSidePropsContext) => {
	const session = await getSession(context);
	return {
		props: {
			session,
			// You can get the messages from anywhere you like. The recommended
			// pattern is to put them in JSON files separated by locale and read
			// the desired one based on the `locale` received from Next.js.
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			messages: (await import(`../../locales/${context.locale}/common.json`)).default,
		},
	};
});
export default OrganizationById;
