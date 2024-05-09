import { type ReactElement } from "react";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import { api } from "~/utils/api";
import { useTranslations } from "use-intl";
import { User, UserOptions } from "@prisma/client";

interface UserExtended extends User {
	options: UserOptions & {
		deAuthorizeWarning: boolean;
	};
}

const UserNetworkSetting = () => {
	const t = useTranslations("userSettings");
	const { mutate: updateSettings } = api.auth.updateUserOptions.useMutation();

	const { data: me, refetch: refetchMe } = api.auth.me.useQuery<UserExtended>();

	return (
		<main className="flex w-full flex-col justify-center space-y-5 bg-base-100 p-3 sm:w-6/12">
			<div className="pb-10">
				<p className="text-sm text-gray-400">
					{t("network.annotations.memberAnotations")}
				</p>
				<div className="divider mt-0 p-0 text-gray-500"></div>
				<div className="flex justify-between py-2">
					<div>
						<p className="font-medium">{t("network.annotations.showMarkerInTable")}</p>
						<p className="text-sm text-gray-500">
							{t.rich("network.annotations.showMarkerInTableDescription", {
								br: () => <br />,
							})}
						</p>
					</div>
					<input
						type="checkbox"
						checked={me?.options?.showNotationMarkerInTableRow || false}
						className="checkbox-primary checkbox checkbox-sm justify-self-end"
						onChange={(e) => {
							updateSettings(
								{
									showNotationMarkerInTableRow: e.target.checked,
								},
								{ onSuccess: () => void refetchMe() },
							);
						}}
					/>
				</div>
				<div className="flex justify-between py-1">
					<div>
						<p className="font-medium">
							{t("network.annotations.addBackgroundColorInTable")}
						</p>
						<p className="text-sm text-gray-500">
							{t.rich("network.annotations.addBackgroundColorInTableDescription", {
								br: () => <br />,
							})}
						</p>
					</div>
					<input
						type="checkbox"
						checked={me?.options?.useNotationColorAsBg || false}
						className="checkbox-primary checkbox checkbox-sm justify-self-end"
						onChange={(e) => {
							updateSettings(
								{
									useNotationColorAsBg: e.target.checked,
								},
								{ onSuccess: () => void refetchMe() },
							);
						}}
					/>
				</div>
			</div>
			<div className="pb-10">
				<p className="text-sm text-gray-400">
					{t("network.memberTable.memberTableTitle")}
				</p>
				<div className="divider mt-0 p-0 text-gray-500"></div>
				<div className="flex justify-between py-2">
					<div>
						<p className="font-medium">
							{t("network.memberTable.deAuthorizationWarningTitle")}
						</p>
						<p className="text-sm text-gray-500">
							{t("network.memberTable.deAuthorizationWarningLabel")}
						</p>
					</div>
					<input
						type="checkbox"
						checked={me?.options?.deAuthorizeWarning || false}
						className="checkbox-primary checkbox checkbox-sm justify-self-end"
						onChange={(e) => {
							updateSettings(
								{
									deAuthorizeWarning: e.target.checked,
								},
								{ onSuccess: () => void refetchMe() },
							);
						}}
					/>
				</div>
				<div className="flex justify-between py-2">
					<div>
						<p className="font-medium">
							{t("network.memberTable.addMemberIdAsNameTitle")}
						</p>
						<p className="text-sm text-gray-500">
							{t("network.memberTable.addMemberIdAsNameLabel")}
						</p>
					</div>
					<input
						type="checkbox"
						checked={me?.options?.addMemberIdAsName || false}
						className="checkbox-primary checkbox checkbox-sm justify-self-end"
						onChange={(e) => {
							updateSettings(
								{
									addMemberIdAsName: e.target.checked,
								},
								{ onSuccess: () => void refetchMe() },
							);
						}}
					/>
				</div>
			</div>
		</main>
	);
};
UserNetworkSetting.getLayout = function getLayout(page: ReactElement) {
	return <LayoutAuthenticated>{page}</LayoutAuthenticated>;
};

export default UserNetworkSetting;
