import { useTranslations } from "next-intl";
import { type ReactElement } from "react";
import { Accounts } from "~/components/adminPage/users/table/accounts";
import UserInvitation from "~/components/adminPage/users/userInvitation";
import { LayoutAdminAuthenticated } from "~/components/layouts/layout";
import UserGroups from "~/components/adminPage/users/userGroups";
import { api } from "~/utils/api";
import {
	useTrpcApiErrorHandler,
	useTrpcApiSuccessHandler,
} from "~/hooks/useTrpcApiHandler";

const Users = () => {
	const t = useTranslations("admin");
	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();

	const {
		data: options,
		refetch: refetchOptions,
		isLoading: loadingOptions,
	} = api.admin.getAllOptions.useQuery();

	const { mutate: setRegistration } = api.admin.updateGlobalOptions.useMutation({
		onSuccess: handleApiSuccess({ actions: [refetchOptions] }),
		onError: handleApiError,
	});

	if (loadingOptions) {
		return (
			<div className="flex flex-col items-center justify-center">
				<h1 className="text-center text-2xl font-semibold">
					<progress className="progress progress-primary w-56"></progress>
				</h1>
			</div>
		);
	}

	return (
		<main className="mx-auto flex-col w-full bg-base-100 p-3 sm:w-8/12">
			<div className="pb-10">
				<p className="text-sm text-gray-400 ">{t("users.authentication.header")}</p>
				<div className="divider mt-0 p-0 text-gray-500"></div>
				<div className="flex items-center justify-between">
					<p className="font-medium">
						{t("users.authentication.enableUserRegistration")}
					</p>
					<input
						type="checkbox"
						checked={options?.enableRegistration}
						className="checkbox-primary checkbox checkbox-sm"
						onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
							setRegistration({ enableRegistration: e.target.checked });
						}}
					/>
				</div>
				<UserInvitation />
			</div>
			<div>
				<p className="text-sm text-gray-400">{t("users.groups.sectionTitle")}</p>
				<div className="divider mt-0 text-gray-500"></div>
			</div>
			<div className="space-y-5 ">
				<div className="w-full">
					<UserGroups />
				</div>
			</div>
			<div className="pt-10 ">
				<p className="text-sm text-gray-400">{t("users.users.sectionTitle")}</p>
				<div className="divider mt-0 text-gray-500"></div>
			</div>
			<div className="w-full">
				<Accounts />
			</div>
		</main>
	);
};
Users.getLayout = function getLayout(page: ReactElement) {
	return <LayoutAdminAuthenticated>{page}</LayoutAdminAuthenticated>;
};

export default Users;
