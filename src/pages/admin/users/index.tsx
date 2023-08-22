import { useTranslations } from "next-intl";
import { type ReactElement } from "react";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import { Accounts } from "~/components/modules/accountTable";
import UserGroups from "~/components/modules/userGroups";

const Users = () => {
	const t = useTranslations("admin");
	return (
		<main className="mx-auto flex-col w-full bg-base-100 p-3 sm:w-6/12">
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
