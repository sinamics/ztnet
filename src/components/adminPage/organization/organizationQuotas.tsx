import { useTranslations } from "next-intl";
import InputField from "~/components/elements/inputField";
import {
	useTrpcApiErrorHandler,
	useTrpcApiSuccessHandler,
} from "~/hooks/useTrpcApiHandler";
import { type RouterOutputs, api } from "~/utils/api";

type OrganizationQuota = RouterOutputs["admin"]["getOrganizationQuotas"][number];

/**
 * Turns a form value into a quota. Empty means unlimited (null). Anything that
 * is not a whole number becomes NaN, which the server rejects with a clear
 * validation message.
 */
const parseQuota = (value: unknown): number | null => {
	const text = String(value ?? "").trim();
	if (text === "") return null;
	return /^\d+$/.test(text) ? Number.parseInt(text, 10) : Number.NaN;
};

const OrganizationQuotaCard = ({ org }: { org: OrganizationQuota }) => {
	const t = useTranslations("admin.organization.quotas");
	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();
	const utils = api.useUtils();

	const { mutateAsync: updateQuotas, isPending } =
		api.admin.updateOrganizationQuotas.useMutation({
			onError: handleApiError,
			onSuccess: handleApiSuccess({
				actions: [() => void utils.admin.getOrganizationQuotas.invalidate()],
			}),
		});

	const limitText = (limit: number | null) => (limit === null ? t("unlimited") : limit);
	const networksOverLimit =
		org.maxNetworks !== null && org.networkCount > org.maxNetworks;

	return (
		<div
			data-testid={`org-quota-${org.id}`}
			className="border border-primary/20 p-4 my-4 rounded bg-base-200 shadow-lg space-y-3"
		>
			<p className="font-semibold">{org.orgName}</p>
			<ul className="text-sm space-y-1">
				<li className="flex justify-between">
					<span>{t("networksUsage")}</span>
					<span data-testid="org-quota-networks">
						{org.networkCount} / {limitText(org.maxNetworks)}
					</span>
				</li>
				<li className="flex justify-between">
					<span>{t("membersUsage")}</span>
					<span data-testid="org-quota-members">
						{org.largestNetworkMembers} / {limitText(org.maxMembersPerNetwork)}
					</span>
				</li>
			</ul>
			{networksOverLimit || org.networksOverMemberCap > 0 ? (
				<p className="text-sm text-warning">{t("overLimitNotice")}</p>
			) : null}
			{org.publicNetworks.length > 0 ? (
				<div role="alert" className="alert alert-warning text-sm">
					<span>
						{t("publicNetworksWarning", {
							networks: org.publicNetworks.map((nw) => nw.name || nw.nwid).join(", "),
						})}
					</span>
				</div>
			) : null}
			{org.uncheckedNetworks.length > 0 ? (
				<p data-testid="org-quota-unchecked" className="text-sm text-warning">
					{t("publicCheckFailed", {
						networks: org.uncheckedNetworks.map((nw) => nw.name || nw.nwid).join(", "),
					})}
				</p>
			) : null}
			<InputField
				label={t("editLabel")}
				description={t("editDescription")}
				placeholder={t("currentLimits", {
					networks: limitText(org.maxNetworks),
					members: limitText(org.maxMembersPerNetwork),
				})}
				isLoading={isPending}
				size="sm"
				rootFormClassName="flex flex-col space-y-2 pt-2"
				fields={[
					{
						name: "maxNetworks",
						type: "number",
						description: t("maxNetworksDescription"),
						placeholder: t("unlimitedPlaceholder"),
						value: org.maxNetworks === null ? "" : String(org.maxNetworks),
					},
					{
						name: "maxMembersPerNetwork",
						type: "number",
						description: t("maxMembersDescription"),
						placeholder: t("unlimitedPlaceholder"),
						value:
							org.maxMembersPerNetwork === null ? "" : String(org.maxMembersPerNetwork),
					},
				]}
				submitHandler={(params) =>
					updateQuotas({
						organizationId: org.id,
						maxNetworks: parseQuota(params.maxNetworks),
						maxMembersPerNetwork: parseQuota(params.maxMembersPerNetwork),
					}).catch(() => undefined)
				}
			/>
		</div>
	);
};

/**
 * Instance admin view of every organization with its quotas and usage.
 */
const OrganizationQuotas = () => {
	const t = useTranslations("admin.organization.quotas");
	const { data: organizations, isPending } = api.admin.getOrganizationQuotas.useQuery();

	return (
		<div>
			<p className="text-sm text-gray-500">{t("description")}</p>
			{!isPending && organizations?.length === 0 ? (
				<p className="text-sm text-gray-500 py-5">{t("noOrganizations")}</p>
			) : null}
			{organizations?.map((org) => (
				<OrganizationQuotaCard key={org.id} org={org} />
			))}
		</div>
	);
};

export default OrganizationQuotas;
