import React from "react";
import InputField from "~/components/elements/inputField";
import { api } from "~/utils/api";

const PrivateRoot = () => {
	const { data: getWorld } = api.admin.getWorld.useQuery();
	const { mutate: makeWorld } = api.admin.makeWorld.useMutation();

	return (
		<div className="space-y-4">
			<div>
				<p className="text-sm text-gray-500">
					<p>Generate private root</p>
				</p>

				<InputField
					isLoading={false}
					label="Generate private root"
					// description="Add a private root to your controller"
					size="sm"
					buttonText="ADD"
					rootFormClassName="space-y-3 "
					rootClassName=""
					labelClassName="text-sm leading-tight py-1"
					fields={[
						{
							name: "domain",
							description: "Add the domain name (optionally)",
							type: "text",
							placeholder: "Domain name",
							value: "",
						},
						{
							name: "comment",
							description: "Add a comment for this planet (optionally)",
							type: "text",
							placeholder: "comment",
							value: "",
						},
						{
							name: "endpoints",
							type: "text",
							description:
								"Enter the external IP address of your controller. Use a comma-separated format (IP/PORT) for multiple addresses. For example: '195.181.173.159/443,2a02:6ea0:c024::/443'. Ensure these addresses are globally reachable if you want nodes outside your local network to connect.",
							placeholder: "IP Address",
							value: `${getWorld?.ip}/443`,
						},
					]}
					submitHandler={(params) =>
						new Promise((resolve) => {
							makeWorld(params);
							resolve(true);
						})
					}
				/>
			</div>
			<div className="">
				<p className="">Invite User</p>
				<p className="text-gray-500 text-sm">
					This will send a email with the custom planet file for the peer to
					connect this private root server.
				</p>
				<div className="join">
					<div>
						<div>
							<input
								className="input input-bordered input-sm join-item"
								placeholder="example@mail.com"
							/>
						</div>
					</div>
					<div className="">
						<button className="btn join-item btn-sm">Send Email</button>
						<button className="btn join-item btn-sm bg-primary">
							Download Planet
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default PrivateRoot;
