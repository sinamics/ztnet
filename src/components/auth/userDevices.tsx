import { useEffect, useState } from "react";
import UAParser from "ua-parser-js";
import type { UserDevice } from "@prisma/client";
import cn from "classnames";
import Smartphone from "~/icons/smartphone";
import Monitor from "~/icons/monitor";
import Tablet from "~/icons/tablet";
import { api } from "~/utils/api";
import { useTranslations } from "next-intl";
import { signOut } from "next-auth/react";

const formatLastActive = (date) => {
	return new Date(date).toLocaleString("no-NO");
};

const DeviceInfo = ({ device, isCurrentDevice }) => {
	const t = useTranslations();
	return (
		<div>
			<p
				className={cn("font-semibold", {
					"text-green-700": isCurrentDevice,
				})}
			>
				{`${device.os} ${device.browser}`}
			</p>
			<p className="text-sm text-gray-500">
				{formatLastActive(device.lastActive)}
				{device.ipAddress && ` - ${device.ipAddress}`}
			</p>
			{isCurrentDevice && (
				<p className="text-xs text-green-600 font-semibold">
					{t("userSettings.account.userDevices.activeNow")}
				</p>
			)}
		</div>
	);
};

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
	const t = useTranslations();
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

	const isCurrentDevice = (device: UserDevice) => {
		return (
			device.browser === currentDeviceInfo?.browser && device.os === currentDeviceInfo?.os
		);
	};

	// sort devices, current device first
	devices?.sort((a, b) => {
		if (isCurrentDevice(a)) return -1;
		if (isCurrentDevice(b)) return 1;
		return 0;
	});
	return (
		<div className="mx-auto">
			<div className="flex justify-between">
				<h1 className="text-md font-semibold mb-4">
					{t("userSettings.account.userDevices.connectedDevices")}
				</h1>
				{/* <button className="btn btn-sm btn-error btn-outline">Logout All</button> */}
			</div>
			<div className="space-y-2 max-h-[500px] overflow-auto custom-scrollbar">
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
								<DeviceInfo device={device} isCurrentDevice={isCurrentDevice(device)} />
							</div>
							<button
								disabled={deleteLoading}
								className="btn btn-sm btn-primary"
								onClick={() => {
									deleteUserDevice({ deviceId: device.deviceId });
									isCurrentDevice(device) && signOut();
								}}
							>
								{t("userSettings.account.userDevices.logout")}
							</button>
						</div>
					))
				) : (
					<p>{t("userSettings.account.userDevices.noDevicesFound")}</p>
				)}
			</div>
		</div>
	);
};

export default ListUserDevices;
