import React, { useState } from "react";
import { api } from "~/utils/api";
import cn from "classnames";
import toast from "react-hot-toast";
import UserRole from "./userRole";
import UserGroup from "./userGroup";
import { useModalStore } from "~/utils/store";
import { useTranslations } from "next-intl";
import UserIsActive from "./userIsActive";
import {
	useTrpcApiErrorHandler,
	useTrpcApiSuccessHandler,
} from "~/hooks/useTrpcApiHandler";

interface Iprops {
	userId: string;
}

const UserOptionsModal = ({ userId }: Iprops) => {
	const t = useTranslations("admin");
	const [deleted, setDelete] = useState(false);
	const [input, setInput] = useState({ name: "" });

	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();

	const { closeModal } = useModalStore((state) => state);

	const { data: user, isLoading: loadingUser } = api.admin.getUser.useQuery({
		userId: userId,
	});
	const { refetch: refetchUsers } = api.admin.getUsers.useQuery({
		isAdmin: false,
	});

	const { mutate: deleteUser, isLoading: userDeleteLoading } =
		api.admin.deleteUser.useMutation({
			onError: handleApiError,
			onSuccess: handleApiSuccess({
				actions: [refetchUsers, closeModal],
				toastMessage: t("users.users.userOptionModal.toast.deleteUserSuccess"),
			}),
		});

	const deleteUserById = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
		e.preventDefault();
		// check if input name is the same as the user name
		if (input.name !== user?.name) {
			toast.error(t("users.users.userOptionModal.toast.nameNotEqual"));
			return;
		}
		deleteUser({
			id: user.id,
		});
	};
	const inputHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
		setInput({
			...input,
			[e.target.name]: e.target.value,
		});
	};
	if (loadingUser) {
		return (
			<div className="fixed inset-0 z-50 flex items-center justify-center">
				<span className="loading loading-bars loading-lg"></span>
			</div>
		);
	}
	return (
		<div>
			{userDeleteLoading ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center">
					<span className="loading loading-bars loading-lg"></span>
				</div>
			) : null}

			<div className={cn({ "opacity-30": userDeleteLoading })}>
				<div className="grid grid-cols-4 items-start gap-4">
					<div className="col-span-4">
						<header className="text-sm">
							{t("users.users.userOptionModal.userGroupLabel")}
						</header>
						<UserGroup user={user} />
					</div>
					<div className="col-span-4">
						<header className="text-sm">
							{t("users.users.userOptionModal.userRoleLabel")}
						</header>
						<UserRole user={user} />
					</div>
					<div className="col-span-4">
						<UserIsActive user={user} />
					</div>
					<div className="col-span-4 ">
						<header className="text-sm">
							{t("users.users.userOptionModal.userActionsLabel")}
						</header>
						{deleted ? (
							<form>
								<input
									type="text"
									name="name"
									onChange={inputHandler}
									placeholder={t("users.users.userOptionModal.typeUserName")}
									className="input input-bordered border-warning input-sm w-full max-w-xs my-2"
								/>

								<div className="flex gap-5">
									<button
										onClick={deleteUserById}
										type="submit"
										className="btn-sm btn-error btn w-2/6"
									>
										{t("users.users.userOptionModal.buttons.deleteUser")}
									</button>
									<button
										onClick={() => setDelete(!deleted)}
										type="submit"
										className="btn-sm btn w-2/6"
									>
										{t("users.users.userOptionModal.buttons.cancle")}
									</button>
								</div>
							</form>
						) : (
							<button
								onClick={() => setDelete(!deleted)}
								type="submit"
								className="btn-sm btn btn-error btn-outline"
							>
								{t("users.users.userOptionModal.buttons.deleteUser")}
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default UserOptionsModal;
