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
import MenuSectionDividerWrapper from "~/components/shared/menuSectionDividerWrapper";

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
		<main className="grid grid-cols-1 lg:grid-cols-2 w-full bg-base-100 p-5 sm:p-3 space-y-10">
			<MenuSectionDividerWrapper
				title={t("users.authentication.header")}
				className="col-span-2 xl:w-6/12"
			>
				<div className="">
					<div className="flex items-center justify-between">
						<label>
							<p className="font-medium">
								{t("users.authentication.enableUserRegistration")}
							</p>
							<p className="text-sm text-gray-500">
								{t("users.authentication.enableUserRegistrationDescription")}
							</p>
						</label>
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
			</MenuSectionDividerWrapper>

			<MenuSectionDividerWrapper
				title={t("users.groups.sectionTitle")}
				className="col-span-2 xl:w-6/12"
			>
				<div className="space-y-5 ">
					<div className="w-full">
						<UserGroups />
					</div>
				</div>
			</MenuSectionDividerWrapper>

			<MenuSectionDividerWrapper
				title={t("users.users.sectionTitle")}
				className="col-span-2"
			>
				<div className="w-12/12">
					<Accounts />
				</div>
			</MenuSectionDividerWrapper>
		</main>
	);
};
Users.getLayout = function getLayout(page: ReactElement) {
	return <LayoutAdminAuthenticated>{page}</LayoutAdminAuthenticated>;
};

export default Users;
