import { type ReactElement } from "react";
import { LayoutOrganizationAuthenticated } from "~/components/layouts/layout";
import { api } from "~/utils/api";
import { useTranslations } from "use-intl";
import { useRouter } from "next/router";

const OrganizationNetworkSetting = () => {
	const router = useRouter();
	const { orgid: organizationId } = router.query;

	const t = useTranslations("userSettings");
	const { mutate: updateSettings } = api.org.updateOrganizationSettings.useMutation();

	const { data: settings, refetch: refetchSettings } =
		api.org.getOrganizationSettings.useQuery({
			organizationId: organizationId as string,
		});

	return (
		<main className="flex w-full flex-col justify-center space-y-5 bg-base-100 p-3 sm:w-6/12">
			<div className="pb-10">
				<p className="text-[0.7rem] text-gray-400 uppercase">
					{t("network.memberTable.memberTableTitle")}
				</p>
				<div className="divider mt-0 p-0 text-gray-500"></div>
				<div className="flex justify-between py-2">
					<div>
						<p className="font-medium">Enable global node naming</p>
						<p className="text-sm text-gray-500">
							When enabled, this feature will:
							<ul className="list-disc list-inside mt-2">
								<li>
									Maintain a consistent name for each node across all networks in the
									organization.
								</li>
								<li>
									Update the node's name in all networks when you rename it in one
									network.
								</li>
								<li>
									Upon member / node registration, check if the member exists in your
									organization and use the first name found.
								</li>
							</ul>
							<p className="mt-2">
								Note: It applies only to networks within the organizations.
							</p>
						</p>
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
