import React, { useState } from "react";
import { api } from "~/utils/api";
import cn from "classnames";
import toast from "react-hot-toast";
import { useModalStore } from "~/utils/store";
import { useTranslations } from "next-intl";
import OrgUserRole from "./orgUserRole";
import { User } from "@prisma/client";
import {
	useTrpcApiErrorHandler,
	useTrpcApiSuccessHandler,
} from "~/hooks/useTrpcApiHandler";

interface Iprops {
	user: Partial<User>;
	organizationId: string;
}

const EditOrganizationUserModal = ({ user, organizationId }: Iprops) => {
	const b = useTranslations("commonButtons");
	const t = useTranslations("admin");

	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();

	const [deleted, setDelete] = useState(false);
	const [input, setInput] = useState({ name: "" });
	const closeModal = useModalStore((state) => state.closeModal);

	const { refetch: refecthOrgUsers } = api.org.getOrgUsers.useQuery({
		organizationId,
	});
	const { refetch: refecthOrg } = api.org.getOrgById.useQuery({
		organizationId,
	});

	const { mutate: kickUser, isLoading: kickUserLoading } = api.org.leave.useMutation({
		onError: handleApiError,
		onSuccess: handleApiSuccess({
			actions: [refecthOrg, refecthOrgUsers, closeModal],
			toastMessage: t("users.users.userOptionModal.toast.deleteUserSuccess"),
		}),
	});

	const kickUserById = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
		e.preventDefault();
		// check if input name is the same as the user name
		if (input.name !== user?.name) {
			toast.error(t("users.users.userOptionModal.toast.nameNotEqual"));
			return;
		}
		kickUser({
			organizationId,
			userId: user.id,
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
			{kickUserLoading ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center">
					<span className="loading loading-bars loading-lg"></span>
				</div>
			) : null}

			<div className={cn({ "opacity-30": kickUserLoading })}>
				<div className="grid grid-cols-4 items-start gap-4">
					<div className="col-span-4">
						<header className="text-sm">
							{t("users.users.userOptionModal.userRoleLabel")}
						</header>
						<OrgUserRole user={user} organizationId={organizationId} />
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
									placeholder="type the name of the user to confirm"
									className="input input-bordered border-warning input-sm w-full max-w-xs my-2"
								/>
								<div className="flex gap-5">
									<button
										onClick={kickUserById}
										type="submit"
										className="btn-sm btn-error btn w-2/6"
									>
										{b("kickUser")}
									</button>
									<button
										onClick={() => setDelete(!deleted)}
										type="submit"
										className="btn-sm btn w-2/6"
									>
										{b("cancel")}
									</button>
								</div>
							</form>
						) : (
							<button
								onClick={() => setDelete(!deleted)}
								type="submit"
								className="btn-sm btn btn-error btn-outline"
							>
								{b("kickUser")}
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default EditOrganizationUserModal;
