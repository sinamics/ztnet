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
		<main className="bg-base-100 min-h-screen p-5">
			<div className="max-w-7xl mx-auto">
				<header className="py-5">
					<div className="container mx-auto flex flex-col items-center justify-center space-y-3">
						<h1 className="text-center text-4xl font-bold">{orgData?.orgName}</h1>
						<p className="text-center text-xl">Organization Dashboard</p>
						<span className="bg-red-600/30 text-white px-4 py-1 rounded-lg shadow-lg text-xs font-medium opacity-75">
							Beta Version - Not for production use!
						</span>
					</div>
				</header>

				<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
					{/* Organization Users */}
					<section className="col-span-1 md:col-span-1 bg-base-200 rounded-lg shadow-lg overflow-hidden">
						<div className="p-4">
							<h2 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2">
								Members
							</h2>
							<ul className="divide-y divide-gray-700">
								{orgData?.users.map((user) => (
									<li
										key={user.id}
										className="py-2 px-3 hover:bg-gray-700 transition duration-150"
									>
										<div className="flex items-center space-x-3">
											<div className="bg-blue-500 h-10 w-10 rounded-full flex items-center justify-center text-lg font-semibold uppercase">
												{user.name[0]}
											</div>
											<div>
												<p className="font-medium">{user.name}</p>
												<p className="text-sm text-gray-400">{user.role}</p>
											</div>
										</div>
									</li>
								))}
							</ul>
						</div>
					</section>

					{/* Organization Information */}
					{/* Organization Information */}
					<section className="col-span-1 md:col-span-1 bg-base-200 rounded-lg shadow-lg p-4">
						<h2 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2">
							Information
						</h2>
						<ul className="space-y-2">
							<li className="flex justify-between">
								<span className="font-medium">Name:</span>
								<span>{orgData?.orgName}</span>
							</li>
							{/* <li className="flex justify-between">
								<span className="font-medium">Created:</span>
								<span>{orgData?.createdAt}</span>
							</li> */}
							<li className="flex justify-between">
								<span className="font-medium">Members:</span>
								<span>{orgData?.users.length}</span>
							</li>
							{/* <li className="flex justify-between">
								<span className="font-medium">Owner:</span>
								<span>{orgData?.ownerName}</span>
							</li> */}
						</ul>
					</section>

					{/* Network Table and Add Network Button */}
					<section className="col-span-2 bg-base-200 rounded-lg shadow-lg">
						<div className="px-4 py-1 flex justify-between items-center border-b border-gray-700">
							<h2 className="text-xl font-semibold">Networks</h2>
							<button
								className="btn btn-primary btn-outline font-semibold py-2 px-4 rounded-lg flex items-center"
								onClick={() => createNetwork({ orgId, orgName: orgData?.orgName })}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									fill="none"
									strokeWidth="1.5"
									stroke="currentColor"
									className="h-6 w-6 mr-2"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M12 4.5v15m7.5-7.5h-15"
									/>
								</svg>
								Add Network
							</button>
						</div>
						<div className="p-1">
							{orgData?.networks && orgData.networks.length > 0 ? (
								<OrganizationNetworkTable tableData={orgData.networks} />
							) : (
								<div className="text-center text-gray-500 py-10">
									<p>No networks to display.</p>
								</div>
							)}
						</div>
					</section>
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
