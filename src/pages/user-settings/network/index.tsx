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
						<p className="font-medium">{t("network.globalNodeNaming.title")}</p>
						<p className="text-sm text-gray-500">
							{t("network.globalNodeNaming.description")}
						</p>
						<ul className="list-disc list-inside mt-2 text-sm text-gray-500">
							<li>{t("network.globalNodeNaming.bulletPoint1")}</li>
							<li>{t("network.globalNodeNaming.bulletPoint2")}</li>
							<li>{t("network.globalNodeNaming.bulletPoint3")}</li>
						</ul>
						<p className="mt-2 text-sm text-gray-500">
							{t("network.globalNodeNaming.note")}
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
