import { useRouter } from "next/router";
import { useEffect, type ReactElement, useState } from "react";
import { LayoutOrganizationAuthenticated } from "~/components/layouts/layout";
import { api } from "~/utils/api";
import { GetServerSidePropsContext } from "next/types";
import { withAuth } from "~/components/auth/withAuth";
import { getSession } from "next-auth/react";
import { OrganizationNetworkTable } from "~/components/organization/networkTable";
import { stringToColor } from "~/utils/randomColor";
import { useModalStore } from "~/utils/store";
import TimeAgo from "react-timeago";
import { ErrorData } from "~/types/errorHandling";
import toast from "react-hot-toast";

const OrganizationById = ({ user }) => {
	const [maxHeight, setMaxHeight] = useState("auto");
	const { query, push } = useRouter();
	const organizationId = query.orgid as string;
	const { callModal } = useModalStore((state) => state);

	const { mutate: leaveOrg } = api.org.leave.useMutation({
		onError: (error) => {
			if ((error.data as ErrorData)?.zodError) {
				const fieldErrors = (error.data as ErrorData)?.zodError.fieldErrors;
				for (const field in fieldErrors) {
					toast.error(`${fieldErrors[field].join(", ")}`);
				}
			} else if (error.message) {
				toast.error(error.message);
			} else {
				toast.error("An unknown error occurred");
			}
		},
	});

	const { data: orgData, refetch: refecthOrg } = api.org.getOrgById.useQuery({
		organizationId,
	});
	const { mutate: createNetwork } = api.org.createOrgNetwork.useMutation();

	useEffect(() => {
		const calculateMaxHeight = () => {
			const offset = 400;
			const calculatedHeight = window.innerHeight - offset;
			setMaxHeight(`${calculatedHeight}px`);
		};

		// Calculate on mount
		calculateMaxHeight();

		// Recalculate on window resize
		window.addEventListener("resize", calculateMaxHeight);

		// Cleanup listener
		return () => window.removeEventListener("resize", calculateMaxHeight);
	}, []);
	return (
		<main className="w-full bg-base-100 p-5">
			<div className="max-w-7xl mx-auto">
				<header className="py-5">
					<div className="container mx-auto flex flex-col items-center justify-center space-y-3">
						<h1 className="text-center text-4xl font-bold">{orgData?.orgName}</h1>
						<p className="text-center text-xl">Organization Dashboard</p>
						<span className="bg-red-600/30 text-white px-4 py-1 rounded-lg shadow-lg text-xs font-medium opacity-75">
							Beta version - use at your own risk!
						</span>
					</div>
				</header>

				<div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
					{/* Organization Users */}
					<section className="bg-base-200 rounded-lg shadow-lg overflow-hidden">
						<div className="p-4">
							<h2 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2">
								Members
							</h2>
							<ul
								style={{ maxHeight: maxHeight }}
								className="divide-y divide-gray-700 overflow-auto custom-scrollbar"
							>
								{orgData?.users.map((user) => {
									const userColor = stringToColor(user.name);
									const userRole = orgData?.userRoles.find(
										(userRole) => userRole.userId === user.id,
									);
									return (
										<li
											key={user.id}
											className="py-2 px-3 hover:bg-gray-700 transition duration-150"
										>
											<div className="flex items-center space-x-3">
												<div
													style={{ backgroundColor: userColor }}
													className="h-9 w-9 rounded-full flex items-center justify-center text-lg font-semibold uppercase opacity-70"
												>
													{user.name[0]}
												</div>
												<div>
													<p className="font-medium">{user.name}</p>
													<p className="text-sm text-gray-400">{userRole.role}</p>
												</div>
											</div>
										</li>
									);
								})}
							</ul>
						</div>
					</section>

					{/* Organization Information */}
					<section className="bg-base-200 rounded-lg shadow-lg p-4">
						<h2 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2">
							Information
						</h2>
						<ul className="space-y-2">
							<li className="flex justify-between">
								<span className="font-medium">Name:</span>
								<span>{orgData?.orgName}</span>
							</li>
							<li className="flex justify-between">
								<span className="font-medium">Created:</span>
								<span>
									<TimeAgo date={orgData?.createdAt} />
								</span>
							</li>
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
					<section className="col-span-1 md:col-span-2 bg-base-200 rounded-lg shadow-lg">
						<div className="px-4 py-1 flex justify-between items-center border-b border-gray-700">
							<h2 className="text-xl font-semibold">Networks</h2>
							<button
								className="btn btn-primary btn-outline font-semibold py-2 px-4 rounded-lg flex items-center"
								onClick={() =>
									createNetwork(
										{
											orgName: orgData?.orgName,
											organizationId,
										},
										{
											onSuccess: () => {
												refecthOrg();
											},
										},
									)
								}
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

					<div className="col-start-1 lg:col-start-4 justify-end flex">
						{/* Footer content */}
						<button
							onClick={() =>
								callModal({
									title: <p>Leave Organization?</p>,
									content: (
										<div>
											<p>Are you sure you want to leave the organization?</p>
											<p className="mt-2 text-sm text-gray-500">
												Note: If you decide to rejoin this organization in the future, an
												admin will need to send you a new invitation.
											</p>
										</div>
									),
									yesAction: () => {
										return leaveOrg(
											{ organizationId, userId: user.id },
											{
												onSuccess: () => {
													push("/dashboard");
												},
											},
										);
									},
								})
							}
							className="btn btn-sm btn-error btn-outline font-semibold py-2 px-4 rounded-lg flex items-center"
						>
							Leave Organization
						</button>
					</div>
				</div>
			</div>
		</main>
	);
};

OrganizationById.getLayout = function getLayout(page: ReactElement) {
	return <LayoutOrganizationAuthenticated>{page}</LayoutOrganizationAuthenticated>;
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
