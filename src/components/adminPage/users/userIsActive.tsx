import { User } from "@prisma/client";
import { useTranslations } from "next-intl";
import React, { ForwardedRef, forwardRef, MouseEvent } from "react";
import toast from "react-hot-toast";
import { ErrorData } from "~/types/errorHandling";
import { api } from "~/utils/api";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface Iuser {
	user: Partial<User>;
}
const DateContainer = ({ children }) => {
	return (
		<div className="react-datepicker">
			<div>{children}</div>
		</div>
	);
};

interface DateButtonProps {
	value?: string | null;
	onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
}

const DateButton = forwardRef<HTMLButtonElement, DateButtonProps>(
	({ value, onClick }, ref: ForwardedRef<HTMLButtonElement>) => (
		<>
			<button className="btn btn-primary btn-sm" onClick={onClick} ref={ref}>
				{value ? value : "Never"}
			</button>
		</>
	),
);

const UserIsActive = ({ user }: Iuser) => {
	const t = useTranslations("admin");
	// Updates this modal as it uses key "getUser"
	// !TODO should rework to update local cache instead.. but this works for now
	const { refetch: refetchUser } = api.admin.getUser.useQuery({
		userId: user?.id,
	});
	const { refetch: refetchUsers } = api.admin.getUsers.useQuery({
		isAdmin: false,
	});

	const { mutate: updateUser } = api.admin.updateUser.useMutation({
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
		onSuccess: () => {
			refetchUser();
			refetchUsers();
		},
	});

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
									params: { isActive: e.target.value === "Active" ? true : false },
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
					<div className="flex gap-5">
						<DatePicker
							className="bg-gray-500"
							selected={user.expiresAt}
							popperPlacement="bottom-start"
							// popperClassName="absolute"
							onChange={(date) =>
								updateUser(
									{
										id: user?.id,
										params: { expiresAt: date },
									},
									{
										onSuccess: () => {
											toast.success("User updated successfully");
										},
									},
								)
							}
							calendarContainer={DateContainer}
							customInput={<DateButton />}
						/>
						{user.expiresAt ? (
							<button
								className="btn btn-sm"
								onClick={() =>
									updateUser(
										{
											id: user?.id,
											params: { expiresAt: null },
										},
										{
											onSuccess: () => {
												toast.success("User updated successfully");
											},
										},
									)
								}
							>
								Reset
							</button>
						) : null}
					</div>
				</div>
			</div>
		</div>
	);
};

export default UserIsActive;
