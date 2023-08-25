import { useTranslations } from "next-intl";
import { type ReactElement } from "react";
import UserInvitation from "~/components/admin/users/userInvitation";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import { Accounts } from "~/components/modules/accountTable";
import UserGroups from "~/components/modules/userGroups";
import { api } from "~/utils/api";

const Users = () => {
	const t = useTranslations("admin");
	const { mutate: setRegistration } = api.admin.updateGlobalOptions.useMutation();

	const {
		data: options,
		refetch: refetchOptions,
		isLoading: loadingOptions,
	} = api.admin.getAllOptions.useQuery();

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
		<main className="mx-auto flex-col w-full bg-base-100 p-3 sm:w-6/12">
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
							setRegistration(
								{ enableRegistration: e.target.checked },
								{ onSuccess: () => void refetchOptions() },
							);
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
	return <LayoutAuthenticated>{page}</LayoutAuthenticated>;
};

export default Users;
