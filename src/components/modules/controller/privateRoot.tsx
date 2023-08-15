import React from "react";
import InputField from "~/components/elements/inputField";
import { api } from "~/utils/api";
import { useModalStore } from "~/utils/store";

const PrivateRoot = () => {
	const { callModal } = useModalStore((state) => state);
	const { data: getWorld } = api.admin.getWorld.useQuery();

	const { data: globalOptions, refetch: refetchOptions } =
		api.settings.getAllOptions.useQuery();

	const { mutate: makeWorld } = api.admin.makeWorld.useMutation({
		onSuccess: () => {
			refetchOptions();
			callModal({
				title: <p>NOTE!</p>,
				rootStyle: "text-left",
				showButtons: true,
				closeModalOnSubmit: true,
				content: (
					<span>
						Custom planet has been generated.
						<br />
						<p>
							You will need to restart zerotier container to load the new
							configuration:
						</p>
						<br />
						<pre className="text-yellow-300">docker restart zerotier</pre>
					</span>
				),
			});
		},
	});
	const { mutate: resetWorld } = api.admin.resetWorld.useMutation({
		onSuccess: () => {
			refetchOptions();
		},
	});
	async function downloadPlanet() {
		try {
			const response = await fetch("/api/planet");
			if (!response.ok) {
				throw new Error("Network response was not ok");
			}
			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.style.display = "none";
			a.href = url;
			// the filename you want
			a.download = "planet.custom";
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
		} catch (error) {
			console.error("There was an error downloading the file:", error);
		}
	}

	return (
		<div className="space-y-4">
			<div>
				<p className="text-sm text-gray-500 pb-4">
					<p>
						Updating the planet file will modify the core structure of your
						ZeroTier network, impacting routes, flexibility, and potentially
						availability. Proceed with caution, understanding the implications.
					</p>
				</p>

				{globalOptions?.customPlanetUsed ? (
					<div className="space-y-4">
						<div className="alert">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								className="stroke-info shrink-0 w-6 h-6"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								></path>
							</svg>
							<span>Custom Planet is currently in use!</span>
						</div>
						<div className="flex justify-between">
							<div className="join">
								<div>
									<div>
										<input
											className="input input-bordered join-item"
											placeholder="example@mail.com"
										/>
									</div>
								</div>
								<div className="">
									<button className="btn join-item">INVITE USER</button>

									<button
										onClick={() => downloadPlanet()}
										className="btn join-item bg-primary"
									>
										Download Planet
									</button>
								</div>
							</div>
							<button
								onClick={() => resetWorld()}
								className="btn btn-outline btn-error"
							>
								Restore Original Planet
							</button>
						</div>
					</div>
				) : (
					<InputField
						isLoading={false}
						label="Generate private root"
						placeholder="Add a private root to your controller"
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
								name: "Identity",
								description:
									"Identity (optionally). Default value is the content of current identity.public",
								type: "text",
								placeholder: "identity",
								value: getWorld?.identity,
							},
							{
								name: "endpoints",
								type: "text",
								description:
									"Enter the external IP address of your controller. Use a comma-separated format (IP/PORT) for multiple addresses. For example: '195.181.173.159/443,2a02:6ea0:c024::/443'. Ensure these addresses are globally reachable if you want nodes outside your local network to connect.",
								placeholder: "IP Address",
								value: `${getWorld?.ip}/9993`,
							},
						]}
						submitHandler={(params) =>
							new Promise((resolve) => {
								makeWorld(params);
								resolve(true);
							})
						}
					/>
				)}
			</div>
			{/* <div className="">
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
			</div> */}
		</div>
	);
};

export default PrivateRoot;
