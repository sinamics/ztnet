import React from "react";
import { api } from "~/utils/api";
import cn from "classnames";
import toast from "react-hot-toast";
import { ErrorData } from "~/types/errorHandling";

interface Iprops {
	userId: number;
}

const UserOptionsModal = ({ userId }: Iprops) => {
	const { mutate: deleteUser, isLoading: userDeleteLoading } =
		api.admin.deleteUser.useMutation({
			onError: (error) => {
				if ((error.data as ErrorData)?.zodError) {
					const fieldErrors = (error.data as ErrorData)?.zodError.fieldErrors;
					for (const field in fieldErrors) {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-call
						toast.error(`${fieldErrors[field].join(", ")}`);
					}
				} else if (error.message) {
					toast.error(error.message);
				} else {
					toast.error("An unknown error occurred");
				}
			},
		});

	// const { data: userById, refetch: refetchUserById } = api.admin.getUser.useQuery({
	// 	userId,
	// });

	return (
		<div>
			{userDeleteLoading ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center">
					<span className="loading loading-bars loading-lg"></span>
				</div>
			) : null}

			<div className={cn({ "opacity-30": userDeleteLoading })}>
				<div className="grid grid-cols-4 items-start gap-4">
					<div className="col-span-3">
						<header>User Option</header>
						<p className="text-sm text-gray-500">
							Select an option to perform on the user.
						</p>
						<button
							onClick={() => {
								deleteUser({
									id: userId,
								});
							}}
							type="submit"
							className="btn-sm btn-error"
						>
							Delete user
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default UserOptionsModal;
