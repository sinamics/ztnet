import React, { ReactElement } from "react";
import Input from "~/components/elements/input";
import { LayoutPublicSupport } from "~/components/layouts/layout";
import { api } from "~/utils/api";
import cn from "classnames";

const Support = () => {
	const [state, setState] = React.useState({ nodeid: "" });
	const { mutate: getStatus, data: nodeStatus } =
		api.public.getNodeidStatus.useMutation();

	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = event.target;
		setState((prevState) => ({ ...prevState, [name]: value }));
	};
	return (
		<div className="mx-auto w-4/6 grid grid-cols-2 gap-5">
			<div className="col-span-2 flex items-center justify-center flex-col">
				{/* <h1 className="text-3xl font-bold">Check your status</h1>
				<p>Type your nodeId to get the current status</p> */}

				<h1 className="text-3xl font-bold text-blue-600">
					Check Your ZTNET Network Status
				</h1>
				<p className="text-lg mt-4">
					To view your current network status within the ZTNET network, please enter your
					node ID in the field provided below. Your node ID is a unique identifier
					assigned to your device within the ZTNET network. Once you submit your node ID,
					you'll be able to see details such as your network ID, whether your node is
					active or has been marked as deleted.
				</p>
				<p className="text-lg mt-2">
					If you are unsure of your node ID, you can find it by running the{" "}
					<code className="bg-primary-content text-primary p-1 rounded">
						zerotier-cli info
					</code>{" "}
					command in your device's terminal.
				</p>

				<form>
					<Input
						onChange={handleChange}
						value={state.nodeid}
						className="border border-primary/30 rounded-lg p-2 mt-5"
						type="text"
						name="nodeid"
						placeholder="Your Node ID"
					/>
					<button
						onClick={(e) => {
							e.preventDefault();
							getStatus(
								{ nodeid: state.nodeid },
								{
									onSuccess: () => {
										setState({ nodeid: "" });
									},
								},
							);
						}}
						className="hidden"
						type="submit"
					/>
				</form>
			</div>
			{nodeStatus?.length > 0 && (
				<div className="col-span-2 flex items-center justify-center flex-col animate-fadeIn">
					<h1 className="text-3xl font-bold text-blue-600 mb-4">
						Your Membership Status
					</h1>
					<div className="grid grid-cols-3 gap-10">
						{nodeStatus.map((status) => (
							<div key={status.nwid} className="py-2">
								<div className="shadow-lg rounded-lg p-6 border border-primary/20">
									<p className="text-lg">
										Network ID: <strong className="text-primary">{status.nwid}</strong>
									</p>
									<p className="text-lg">
										Status:{" "}
										<strong
											className={cn({
												"text-red-500": status.deleted,
												"text-green-500": !status.deleted && status.authorized,
												"text-yellow-500": !status.deleted && !status.authorized,
											})}
										>
											{status.deleted
												? "Not Active"
												: status.authorized
												  ? "Active"
												  : "Authorization Pending"}
										</strong>
									</p>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			<details
				tabIndex={0}
				className="col-span-2 collapse border border-base-300 bg-base-200 mt-20"
			>
				<summary className="collapse-title text-xl font-medium">
					Zerotier Installation Instructions
				</summary>
				<div className="collapse-content grid grid-cols-2 gap-5">
					<div>
						<h1 className="text-3xl font-bold text-center text-blue-600 mb-8">
							Install ZeroTier on Linux
						</h1>
						<ul className="space-y-3 list-decimal list-inside border border-primary/30 shadow-lg rounded-lg p-6 divide-y divide-primary-content/20">
							<li className="py-4">
								<strong className="text-lg text-primary">Update System Packages</strong>:
								<ul className="ml-4 list-inside">
									Before installing, ensure your Linux system is up to date:
									<code className="block bg-primary-content text-gray-700 p-2 mt-2 rounded">
										sudo apt update && sudo apt upgrade -y
									</code>
								</ul>
							</li>
							<li className="py-4">
								<strong className="text-lg text-primary">Install ZeroTier</strong>:
								<ul className="ml-4 list-inside">
									<li>
										For Debian/Ubuntu-based systems:
										<code className="block bg-primary-content text-gray-700 p-2 mt-2 rounded">
											curl -s https://install.zerotier.com | sudo bash
										</code>
									</li>
									<li>
										For other distributions, check the ZeroTier download page for specific
										instructions.
									</li>
								</ul>
							</li>
							<li className="py-4">
								<strong className="text-lg text-primary">Join a ZeroTier Network</strong>:
								<ul className="ml-4 list-inside">
									<li>
										Use the following command to join a network, replacing{" "}
										<code className="bg-primary-content text-gray-700 p-1 rounded">
											your_network_id
										</code>{" "}
										with the actual network ID:
										<code className="block bg-primary-content text-gray-700 p-2 mt-2 rounded">
											sudo zerotier-cli join your_network_id
										</code>
									</li>
								</ul>
							</li>
							<li className="py-4">
								<strong className="text-lg text-primary">View Your Node ID</strong>:
								<ul className="ml-4">
									<li>
										To view your ZeroTier node ID, use the following command:
										<code className="block bg-gray-100 text-gray-700 p-2 mt-2 rounded">
											sudo zerotier-cli info
										</code>
									</li>
								</ul>
							</li>
							<li className="py-4">
								<strong className="text-lg text-primary">Check Connection Status</strong>:
								<ul className="ml-4 list-inside">
									<li>
										Verify that your machine has connected successfully:
										<code className="block bg-primary-content text-gray-700 p-2 mt-2 rounded">
											sudo zerotier-cli listnetworks
										</code>
									</li>
								</ul>
							</li>
						</ul>
					</div>
					<div>
						<h1 className="text-3xl font-bold text-center text-blue-600 mb-8">
							Install ZeroTier on Windows
						</h1>
						<ul className="space-y-3 list-decimal list-inside border border-primary/30 shadow-lg rounded-lg p-6 divide-y divide-primary-content/20">
							<li className="py-4">
								<strong className="text-lg text-primary">
									Download ZeroTier Installer
								</strong>
								: Download the ZeroTier installer for Windows from the official ZeroTier
								website.
							</li>
							<li className="py-4">
								<strong className="text-lg text-primary">Run the Installer</strong>:
								<ul className="ml-4 list-inside">
									<li>
										Execute the downloaded installer and follow the on-screen instructions
										to install ZeroTier on your Windows system.
									</li>
								</ul>
							</li>
							<li className="py-4">
								<strong className="text-lg text-primary">Join a ZeroTier Network</strong>:
								<ul className="ml-4 list-inside">
									<li>After installation, open ZeroTier from the Start menu.</li>
									<li>
										Click on the ZeroTier icon in the system tray, and select 'Join
										Network'.
									</li>
									<li>Enter the network ID you wish to join and click 'OK'.</li>
								</ul>
							</li>
							<li className="py-4">
								<strong className="text-lg text-primary">Check Connection Status</strong>:
								<ul className="ml-4 list-inside">
									<li>
										Right-click the ZeroTier icon in the system tray and select 'Show
										Networks' to view connected networks.
									</li>
								</ul>
							</li>
							<li className="py-4">
								<strong className="text-lg text-primary">Authorize Device</strong> (if
								required):
								<ul className="ml-4 list-inside">
									<li>Log in to your Ztnet account through their web interface.</li>
									<li>
										Navigate to the network you joined and authorize your new device.
									</li>
								</ul>
							</li>
							<li className="py-4">
								<strong className="text-lg text-primary">View Your Node ID</strong>:
								<ul className="ml-4 list-inside">
									<li>
										Right-click the ZeroTier icon in the system tray and select 'Show
										Networks'. Your Node ID will be displayed at the top of the window.
									</li>
								</ul>
							</li>
						</ul>
					</div>
				</div>
			</details>
		</div>
	);
};

Support.getLayout = function getLayout(page: ReactElement) {
	return <LayoutPublicSupport>{page}</LayoutPublicSupport>;
};

export default Support;
