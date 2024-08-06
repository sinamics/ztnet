import { type ReactElement } from "react";
import { LayoutOrganizationAuthenticated } from "~/components/layouts/layout";
import { api } from "~/utils/api";
import { useTranslations } from "use-intl";
import { useRouter } from "next/router";
import MenuSectionDividerWrapper from "~/components/shared/menuSectionDividerWrapper";

const OrganizationNetworkSetting = () => {
	const router = useRouter();
	const { orgid: organizationId } = router.query;
	const t = useTranslations();

	// const t = useTranslations("userSettings");
	const { mutate: updateSettings } = api.org.updateOrganizationSettings.useMutation();

	const { data: settings, refetch: refetchSettings } =
		api.org.getOrganizationSettings.useQuery({
			organizationId: organizationId as string,
		});

	return (
		<main className="flex w-full flex-col justify-center space-y-5 bg-base-100 p-5 sm:p-3 xl:w-6/12">
			<MenuSectionDividerWrapper title={t("commonMenuTiles.members")}>
				<div className="flex justify-between py-2">
					<div>
						<p className="font-medium">
							{t("organization.settings.network.globalNodeNaming.title")}
						</p>
						<span className="text-sm text-gray-500">
							{t("organization.settings.network.globalNodeNaming.description")}
							<ul className="list-disc list-inside mt-2">
								{t("organization.settings.network.globalNodeNaming.bulletPoints")
									.split("\n")
									.filter((point) => point.trim() !== "")
									.map((point, index) => (
										// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
										<li key={index}>{point.trim()}</li>
									))}
							</ul>
							<p className="mt-2">
								{t("organization.settings.network.globalNodeNaming.note")}
							</p>
						</span>
					</div>
					<input
						type="checkbox"
						checked={settings?.renameNodeGlobally || false}
						className="checkbox-primary checkbox checkbox-sm justify-self-end"
						onChange={(e) => {
							updateSettings(
								{
									organizationId: organizationId as string,
									renameNodeGlobally: e.target.checked,
								},
								{ onSuccess: () => void refetchSettings() },
							);
						}}
					/>
				</div>
			</MenuSectionDividerWrapper>
		</main>
	);
};
OrganizationNetworkSetting.getLayout = function getLayout(page: ReactElement) {
	return <LayoutOrganizationAuthenticated>{page}</LayoutOrganizationAuthenticated>;
};

export default OrganizationNetworkSetting;
