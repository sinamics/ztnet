import { User } from "@prisma/client";
import { useTranslations } from "next-intl";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { api } from "~/utils/api";
import {
	useTrpcApiErrorHandler,
	useTrpcApiSuccessHandler,
} from "~/hooks/useTrpcApiHandler";

interface Iuser {
	user: Partial<User>;
}

const UserIsActive = ({ user }: Iuser) => {
	const t = useTranslations("admin");
	const [manualDate, setManualDate] = useState<string | null>(
		user.expiresAt ? new Date(user.expiresAt).toISOString().substring(0, 10) : null,
	);
	const [isEdited, setIsEdited] = useState<boolean>(false);

	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();

	// Updates this modal as it uses key "getUser"
	// !TODO should rework to update local cache instead.. but this works for now
	const { refetch: refetchUser } = api.admin.getUser.useQuery({
		userId: user?.id,
	});
	const { refetch: refetchUsers } = api.admin.getUsers.useQuery({
		isAdmin: false,
	});

	const { mutate: updateUser } = api.admin.updateUser.useMutation({
		onError: handleApiError,
		onSuccess: handleApiSuccess({ actions: [refetchUser, refetchUsers] }),
	});
	const handleManualDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setManualDate(e.target.value);
		setIsEdited(true);
	};
	const handleSaveDate = () => {
		if (manualDate) {
			const parsedDate = new Date(manualDate);
			if (!Number.isNaN(parsedDate.getTime())) {
				updateUser(
					{
						id: user?.id,
						params: { expiresAt: parsedDate },
					},
					{
						onSuccess: () => {
							toast.success("User updated successfully");
							setIsEdited(false);
						},
					},
				);
			} else {
				toast.error("Invalid date format");
			}
		}
	};
	const handleResetDate = () => {
		updateUser(
			{
				id: user?.id,
				params: { expiresAt: null },
			},
			{
				onSuccess: () => {
					toast.success("User updated successfully");
					setManualDate(null);
					setIsEdited(false);
				},
			},
		);
	};
	return (
		<div>
			<p className="text-sm text-gray-500">
				{t("users.users.userOptionModal.account.title")}
			</p>
			<div className="form-control grid grid-cols-1 md:grid-cols-3 gap-10 relative">
				<div>
					<header className="text-sm">
						{t("users.users.userOptionModal.account.userAccountLabel")}
					</header>
					<select
						value={user?.isActive ? "Active" : "Disabled"}
						onChange={(e) => {
							updateUser(
								{
									id: user?.id,
									params: { isActive: e.target.value === "Active" },
								},
								{
									onSuccess: () => {
										toast.success("User updated successfully");
									},
								},
							);
						}}
						className="select select-sm select-bordered select-ghost max-w-xs"
					>
						<option value="Active">Active</option>
						<option value="Disabled">Disabled</option>
					</select>
				</div>
				<div className="col-span-2">
					<p className="text-sm">
						{t("users.users.userOptionModal.account.userExpireLabel")}
					</p>
					<div className="flex gap-5 relative">
						<input
							type={manualDate ? "date" : "text"}
							onFocus={(e) => {
								e.target.type = "date";
							}}
							aria-label="Date"
							className="input input-bordered btn-sm"
							placeholder="Never"
							value={manualDate || ""}
							onChange={handleManualDateChange}
							style={{
								zIndex: 2,
								backgroundColor: manualDate ? "inherit" : "transparent",
							}}
						/>
						{manualDate && isEdited && (
							<button className="btn btn-sm btn-primary" onClick={handleSaveDate}>
								Save
							</button>
						)}
						{user.expiresAt && !isEdited && (
							<button className="btn btn-sm" onClick={handleResetDate}>
								Reset
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default UserIsActive;
