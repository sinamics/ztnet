import { type ReactElement } from "react";
import { LayoutOrganizationAuthenticated } from "~/components/layouts/layout";
import { api } from "~/utils/api";
import { useTranslations } from "use-intl";
import { useRouter } from "next/router";

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
		<main className="flex w-full flex-col justify-center space-y-5 bg-base-100 p-3 sm:w-6/12">
			<div className="pb-10">
				<p className="text-[0.7rem] text-gray-400 uppercase">
					{t("commonMenuTiles.members")}
				</p>
				<div className="divider mt-0 p-0 text-gray-500"></div>
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
			</div>
		</main>
	);
};
OrganizationNetworkSetting.getLayout = function getLayout(page: ReactElement) {
	return <LayoutOrganizationAuthenticated>{page}</LayoutOrganizationAuthenticated>;
};

export default OrganizationNetworkSetting;
