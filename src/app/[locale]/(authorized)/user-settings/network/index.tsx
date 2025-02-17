import { type ReactElement } from "react";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import { api } from "~/utils/api";
import { useTranslations } from "next-intl";
import { User, UserOptions } from "@prisma/client";
import MenuSectionDividerWrapper from "~/components/shared/menuSectionDividerWrapper";

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
		<main className="flex w-full flex-col justify-center space-y-10 bg-base-100 p-5 sm:p-3 xl:w-6/12">
			<MenuSectionDividerWrapper
				title={t("network.annotations.memberAnotations")}
				className="space-y-5"
			>
				<div className="flex justify-between">
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
			</MenuSectionDividerWrapper>
			<MenuSectionDividerWrapper
				title={t("network.memberTable.memberTableTitle")}
				className="space-y-5"
			>
				<div className="flex justify-between">
					<div>
						<p className="font-medium">Enable global node naming</p>
						<p className="text-sm text-gray-500">When enabled, this feature will:</p>
						<ul className="list-disc list-inside mt-2 text-sm text-gray-500">
							<li>
								Maintain a consistent name for each node across all networks you manage.
							</li>
							<li>
								Update the node's name in all your networks when you rename it in one
								network.
							</li>
							<li>
								Upon member / node registration, check if the member exists in your other
								networks and use the first name found.
							</li>
						</ul>
						<p className="mt-2 text-sm text-gray-500">
							Note: This feature has priority over "Add Member ID as Name". It applies
							only to networks where you are the author and doesn't affect networks
							managed by others or organizations.
						</p>
					</div>
					<input
						type="checkbox"
						checked={me?.options?.renameNodeGlobally || false}
						className="checkbox-primary checkbox checkbox-sm justify-self-end"
						onChange={(e) => {
							updateSettings(
								{
									renameNodeGlobally: e.target.checked,
								},
								{ onSuccess: () => void refetchMe() },
							);
						}}
					/>
				</div>
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
			</MenuSectionDividerWrapper>
		</main>
	);
};
UserNetworkSetting.getLayout = function getLayout(page: ReactElement) {
	return <LayoutAuthenticated>{page}</LayoutAuthenticated>;
};

export default UserNetworkSetting;
