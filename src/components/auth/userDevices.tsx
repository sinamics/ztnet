import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import UAParser from "ua-parser-js";
import type { UserDevice } from "@prisma/client";
import cn from "classnames";
import Smartphone from "~/icons/smartphone";
import Monitor from "~/icons/monitor";
import Tablet from "~/icons/tablet";
import { api } from "~/utils/api";

const DeviceIcon = ({ deviceType }: { deviceType: string }) => {
	switch (deviceType.toLowerCase()) {
		case "mobile":
			return <Smartphone className="w-6 h-6 mr-2" />;
		case "tablet":
			return <Tablet className="w-6 h-6 mr-2" />;
		default:
			return <Monitor className="w-6 h-6 mr-2" />;
	}
};

const ListUserDevices: React.FC<{ devices: UserDevice[] }> = ({ devices }) => {
	const { data: session, status } = useSession();
	const { refetch } = api.auth.me.useQuery();

	const { mutate: deleteUserDevice, isLoading: deleteLoading } =
		api.auth.deleteUserDevice.useMutation({
			onSuccess: () => {
				// Refresh the devices list
				refetch();
			},
		});

	const [currentDeviceInfo, setCurrentDeviceInfo] = useState<{
		browser: string;
		os: string;
	} | null>(null);

	useEffect(() => {
		const ua = new UAParser(navigator.userAgent);
		setCurrentDeviceInfo({
			browser: ua.getBrowser().name || "Unknown",
			os: ua.getOS().name || "Unknown",
		});
	}, []);

	if (status === "loading") {
		return <div>Loading...</div>;
	}

	if (status === "unauthenticated" || !session) {
		return <div>Access Denied</div>;
	}

	const isCurrentDevice = (device: UserDevice) => {
		return (
			device.browser === currentDeviceInfo?.browser && device.os === currentDeviceInfo?.os
		);
	};

	return (
		<div className="mx-auto">
			<div className="flex justify-between">
				<h1 className="font-medium mb-4">Connected Devices</h1>
				{/* <button className="btn btn-sm btn-error btn-outline">Logout All</button> */}
			</div>
			<div className="space-y-2">
				{devices && devices.length > 0 ? (
					devices.map((device) => (
						<div
							key={device.id}
							className={cn(
								"flex items-center justify-between px-4 py-1 rounded-lg shadow border",
								{ "border-l-4 border-green-500": isCurrentDevice(device) },
							)}
						>
							<div className="flex items-center">
								<DeviceIcon deviceType={device.deviceType} />
								<div>
									<p
										className={cn("font-semibold", {
											"text-green-700": isCurrentDevice(device),
										})}
									>{`${device.os} ${device.browser}`}</p>
									<p className="text-sm text-gray-500">
										{new Date(device.lastActive).toLocaleString("no-NO")}
									</p>
									{isCurrentDevice(device) && (
										<p className="text-xs text-green-600 font-semibold">Active Now</p>
									)}
								</div>
							</div>
							<button
								disabled={deleteLoading}
								className="btn btn-sm btn-primary"
								onClick={() => deleteUserDevice({ deviceId: device.deviceId })}
							>
								Logg ut
							</button>
						</div>
					))
				) : (
					<p>Ingen enheter funnet.</p>
				)}
			</div>
		</div>
	);
};

export default ListUserDevices;
