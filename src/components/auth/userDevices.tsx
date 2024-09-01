import type { UserDevice } from "@prisma/client";
import cn from "classnames";
import Smartphone from "~/icons/smartphone";
import Monitor from "~/icons/monitor";
import Tablet from "~/icons/tablet";
import { api } from "~/utils/api";
import { useTranslations } from "next-intl";
import { signOut, useSession } from "next-auth/react";
import TimeAgo from "react-timeago";

const formatLastActive = (date) => {
	return new Date(date).toLocaleString("no-NO");
};

const DeviceInfo = ({ device, isCurrentDevice }) => {
	const t = useTranslations();

	// if lastActive is within 5 minutes, show as active
	const lastActive = new Date(device.lastActive);
	const now = new Date();
	const diff = Math.abs(now.getTime() - lastActive.getTime()) / 1000;
	const isRecent = diff < 300;

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
				<p className="text-xs text-green-600 font-semibold capitalize">
					{t("userSettings.account.userDevices.currentDevice")}
				</p>
			)}
			{!isCurrentDevice && isRecent && (
				<p className="text-xs text-green-600 font-semibold">Online</p>
			)}
			{!isCurrentDevice && !isRecent && (
				<p className="text-xs text-gray-500">
					<TimeAgo date={device.lastActive} />
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
	const { data: session } = useSession();
	const { mutate: deleteUserDevice, isLoading: deleteLoading } =
		api.auth.deleteUserDevice.useMutation({
			onSuccess: () => {
				// Refresh the devices list
				refetch();
			},
		});

	const invalidateUserDevice = async () => {
		try {
			await fetch("/api/auth/user/invalidateUserDevice", {
				method: "POST",
			});
		} catch (error) {
			console.error("Error deleting device cookie:", error);
		}
	};

	const currentDeviceId = session?.user?.deviceId;

	const isCurrentDevice = (device: UserDevice) => {
		return device?.deviceId === currentDeviceId;
	};

	// sort devices, current device first
	const sortedDevices = [...(devices || [])].sort((a, b) => {
		if (isCurrentDevice(a)) return -1;
		if (isCurrentDevice(b)) return 1;
		return 0;
	});
	// sort devices by lastActive
	const sortedDevicesByLastActive = [...(sortedDevices || [])].sort((a, b) => {
		return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime();
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
				{sortedDevicesByLastActive && sortedDevicesByLastActive.length > 0 ? (
					sortedDevicesByLastActive.map((device) => (
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
									isCurrentDevice(device) && signOut().then(() => invalidateUserDevice());
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
