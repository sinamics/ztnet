import { type ReactElement } from "react";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import { api } from "~/utils/api";
import { useTranslations } from "use-intl";

const UserNetworkSetting = () => {
	const t = useTranslations("admin");
	const { mutate: updateNotation } = api.auth.updateUserNotation.useMutation();
	const { data: me, refetch: refetchMe } = api.auth.me.useQuery();

	return (
		<main className="mx-auto flex w-full flex-col justify-center space-y-5 bg-base-100 p-3 sm:w-6/12">
			<div className="pb-10">
				<p className="text-sm text-gray-400">
					{t("networkSetting.memberAnotations")}
				</p>
				<div className="divider mt-0 p-0 text-gray-500"></div>
				<div className="flex justify-between py-2">
					<div>
						<p className="font-medium">
							{t("networkSetting.showMarkerInTable")}
						</p>
						<p className="text-sm text-gray-500">
							{t.rich("networkSetting.showMarkerInTableDescription", {
								br: () => <br />,
							})}
						</p>
					</div>
					<input
						type="checkbox"
						checked={me?.options?.showNotationMarkerInTableRow || false}
						className="checkbox-primary checkbox checkbox-sm justify-self-end"
						onChange={(e) => {
							updateNotation(
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
							{t("networkSetting.addBackgroundColorInTable")}
						</p>
						<p className="text-sm text-gray-500">
							{t.rich("networkSetting.addBackgroundColorInTableDescription", {
								br: () => <br />,
							})}
						</p>
					</div>
					<input
						type="checkbox"
						checked={me?.options?.useNotationColorAsBg || false}
						className="checkbox-primary checkbox checkbox-sm justify-self-end"
						onChange={(e) => {
							updateNotation(
								{
									useNotationColorAsBg: e.target.checked,
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
