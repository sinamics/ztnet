import React, { useState } from "react";
import { api } from "~/utils/api";
import cn from "classnames";
import toast from "react-hot-toast";
import { ErrorData } from "~/types/errorHandling";
import UserRole from "./userRole";
import UserGroup from "./userGroup";

interface Iprops {
	userId: number;
}

const UserOptionsModal = ({ userId }: Iprops) => {
	const [deleted, setDelete] = useState(false);
	const [input, setInput] = useState({ name: "" });

	const { data: userById } = api.admin.getUser.useQuery({
		userId,
	});
	const { mutate: deleteUser, isLoading: userDeleteLoading } =
		api.admin.deleteUser.useMutation({
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
		});
	const deleteUserById = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
		e.preventDefault();
		// check if input name is the same as the user name
		if (input.name !== userById?.name) {
			toast.error("The username you entered is not the same as the user.");
			return;
		}
		deleteUser({
			id: userId,
		});
	};
	const inputHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
		setInput({
			...input,
			[e.target.name]: e.target.value,
		});
	};
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
						<header>User Group</header>
						<UserGroup user={userById} />
					</div>
					<div className="col-span-4">
						<header>User Role</header>
						<UserRole user={userById} />
					</div>
					<div className="col-span-4">
						<header>User Action</header>
						<p className="text-sm text-gray-500">
							Select an option to perform on the user.
						</p>
						{deleted ? (
							<form>
								<input
									type="text"
									name="name"
									onChange={inputHandler}
									placeholder="Type the name of the user."
									className="input input-bordered border-warning input-sm w-full max-w-xs my-2"
								/>

								<div className="flex gap-5">
									<button
										onClick={deleteUserById}
										type="submit"
										className="btn-sm btn-error btn w-2/6"
									>
										Delete user
									</button>
									<button
										onClick={
											() => setDelete(!deleted)
											// deleteUser({
											// 	id: userId,
											// });
										}
										type="submit"
										className="btn-sm btn w-2/6"
									>
										Cancle
									</button>
								</div>
							</form>
						) : (
							<button
								onClick={
									() => setDelete(!deleted)
									// deleteUser({
									// 	id: userId,
									// });
								}
								type="submit"
								className="btn-sm btn btn-error btn-outline"
							>
								Delete user
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default UserOptionsModal;
