import { ReactElement } from "react";
import Input from "~/components/elements/input";
import { LayoutOrganizationAuthenticated } from "~/components/layouts/layout";
import { getServerSideProps } from "~/server/getServerSideProps";

const Invites = () => {
	return (
		<div>
			<div className="space-y-6">
				<div className="space-y-2">
					<h1 className="text-3xl font-bold">Invite users</h1>
					<p className="text-gray-500 dark:text-gray-400">
						Invite users to your team by email or by searching for existing users.
					</p>
				</div>
				<div className="space-y-6">
					<div className="space-y-2">
						<h2 className="text-lg font-semibold">Search for existing users</h2>
						<div className="flex items-center space-x-4">
							<Input className="w-1/2" placeholder="Search for users" type="search" />
							<button className="btn btn-primary btn-sm">Search</button>
						</div>
						<div className="border border-dashed border-gray-200 rounded-lg p-4 w-full dark:border-gray-800">
							<div className="flex items-center space-x-4">
								<div className="flex items-center space-x-2">
									<img
										alt="Avatar for user"
										className="rounded-full"
										height="40"
										src="/placeholder.svg"
										style={{
											aspectRatio: "40/40",
											objectFit: "cover",
										}}
										width="40"
									/>
									<div>
										<h3 className="text-lg font-semibold">Alice Freeman</h3>
										<p className="text-sm text-gray-500 dark:text-gray-400">
											alice.freeman@example.com
										</p>
									</div>
								</div>
								<div className="flex items-center space-x-2">
									<div className="flex items-center space-x-1">
										<div className="w-4 h-4 text-gray-400" />
										<span className="text-sm text-gray-500 dark:text-gray-400">
											Invited
										</span>
									</div>
									<button className="btn btn-primary btn-sm">Resend</button>
								</div>
							</div>
						</div>
					</div>
					<div className="space-y-2">
						<h2 className="text-lg font-semibold">Invite via email</h2>
						<div className="grid gap-4">
							<div className="grid sm:grid-cols-2 gap-4">
								<div>
									<label className="text-sm" htmlFor="email">
										Email
									</label>
									<Input placeholder="Email" type="email" />
								</div>
								<div>
									<label className="text-sm" htmlFor="email2">
										Email
									</label>
									<Input placeholder="Email" type="email" />
								</div>
							</div>
							<button className="btn btn-primary btn-sm">Add another</button>
						</div>
					</div>
					<div className="space-y-2">
						<h2 className="text-lg font-semibold">Generated invitation tokens</h2>
						<div className="grid gap-4">
							<div className="grid sm:grid-cols-2 gap-4">
								<div>
									<label className="text-sm" htmlFor="token">
										Token
									</label>
									<Input placeholder="Token" />
								</div>
								<div>
									<label className="text-sm" htmlFor="token2">
										Token
									</label>
									<Input placeholder="Token" />
								</div>
							</div>
							<button className="btn btn-primary btn-sm">Generate more</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

Invites.getLayout = function getLayout(page: ReactElement) {
	return <LayoutOrganizationAuthenticated>{page}</LayoutOrganizationAuthenticated>;
};

export { getServerSideProps };

export default Invites;
