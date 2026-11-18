import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import EditableField from "~/components/elements/inputField";
import MenuSectionDividerWrapper from "~/components/shared/menuSectionDividerWrapper";
import { useEventPaging } from "~/components/memberStatusLog/useEventPaging";
import {
	type MemberStatus,
	StatusEventFilters,
	StatusEventTable,
} from "~/components/memberStatusLog/statusEventTable";
import {
	useTrpcApiErrorHandler,
	useTrpcApiSuccessHandler,
} from "~/hooks/useTrpcApiHandler";
import { api } from "~/utils/api";
import { useModalStore } from "~/utils/store";

// Keep in sync with MEMBER_STATUS_LOG_LIMITS on the server, which is what
// actually enforces them.
const LIMITS = {
	retentionDays: { min: 1, max: 365 },
	sampleInterval: { min: 10, max: 3600 },
};

const PAGE_SIZE = 25;

const parseWholeNumber = (value: unknown, { min, max }: { min: number; max: number }) => {
	const text = String(value ?? "").trim();
	if (!/^\d+$/.test(text)) return null;
	const n = Number(text);
	return n >= min && n <= max ? n : null;
};

/**
 * The log across every local network, for admins. Renders nothing while the
 * log is disabled. Kept apart from the settings so the page can give the
 * table the full width.
 */
export const InstanceMemberStatusLog = () => {
	const { data: options } = api.admin.getAllOptions.useQuery();
	if (options?.memberStatusLogEnabled !== true) return null;
	return (
		<InstanceStatusLogTable
			showConnectionChanges={options.memberStatusLogConnectionChanges === true}
		/>
	);
};

const InstanceStatusLogTable = ({
	showConnectionChanges,
}: {
	showConnectionChanges: boolean;
}) => {
	const t = useTranslations("memberStatusLog");
	const a = useTranslations("admin.settings.memberStatusLog");
	const callModal = useModalStore((state) => state.callModal);
	const handleApiError = useTrpcApiErrorHandler();

	const [nwid, setNwid] = useState("");
	const [addressSearch, setAddressSearch] = useState("");
	const [status, setStatus] = useState<MemberStatus | "">("");
	const [includeConnectionChanges, setIncludeConnectionChanges] = useState(false);
	const paging = useEventPaging();

	const { data: networks } = api.admin.getMemberStatusLogNetworks.useQuery();
	const { data, isPending, isPlaceholderData, refetch } =
		api.admin.getMemberStatusLog.useQuery(
			{
				nwid: nwid || undefined,
				addressSearch: addressSearch || undefined,
				status: status || undefined,
				includeConnectionChanges: showConnectionChanges && includeConnectionChanges,
				cursor: paging.cursor,
				pageSize: PAGE_SIZE,
			},
			{ refetchInterval: 30000, placeholderData: (previous) => previous },
		);
	const { mutate: clearLog } = api.admin.clearMemberStatusLog.useMutation({
		onSuccess: ({ deleted }) => {
			toast.success(a("cleared", { count: deleted }));
			paging.reset();
			void refetch();
		},
		onError: handleApiError,
	});

	const withPageReset =
		<T,>(setter: (value: T) => void) =>
		(value: T) => {
			setter(value);
			paging.reset();
		};

	return (
		<MenuSectionDividerWrapper
			title={a("instanceLog.sectionTitle")}
			className="space-y-4"
		>
			<div className="flex items-start justify-between gap-4">
				<div>
					<p className="font-medium">{a("instanceLog.title")}</p>
					<p className="text-sm text-gray-500">{a("instanceLog.description")}</p>
				</div>
				<button
					type="button"
					className="btn btn-error btn-outline btn-sm"
					disabled={!data?.hasEvents}
					onClick={() =>
						callModal({
							title: a("clear.title"),
							description: a("clear.description"),
							yesAction: () => clearLog(),
						})
					}
				>
					{a("clear.button")}
				</button>
			</div>
			<StatusEventFilters
				status={status}
				onStatusChange={withPageReset(setStatus)}
				includeConnectionChanges={includeConnectionChanges}
				onIncludeConnectionChangesChange={withPageReset(setIncludeConnectionChanges)}
				showConnectionChanges={showConnectionChanges}
			>
				<label className="form-control">
					<span className="label-text text-xs text-gray-500">{t("filters.network")}</span>
					<select
						aria-label={t("filters.network")}
						className="select select-bordered select-sm max-w-xs"
						value={nwid}
						onChange={(e) => withPageReset(setNwid)(e.target.value)}
					>
						<option value="">{t("filters.allNetworks")}</option>
						{networks?.map((network) => (
							<option key={network.nwid} value={network.nwid}>
								{network.name ? `${network.name} (${network.nwid})` : network.nwid}
							</option>
						))}
					</select>
				</label>
				<label className="form-control">
					<span className="label-text text-xs text-gray-500">{t("filters.address")}</span>
					<input
						type="text"
						aria-label={t("filters.address")}
						className="input input-bordered input-sm w-36 font-mono"
						placeholder={t("filters.addressPlaceholder")}
						maxLength={10}
						value={addressSearch}
						onChange={(e) => withPageReset(setAddressSearch)(e.target.value.trim())}
					/>
				</label>
			</StatusEventFilters>
			<StatusEventTable
				events={data?.events ?? []}
				total={data?.total ?? 0}
				totalIsCapped={data?.totalIsCapped}
				page={paging.page}
				pageSize={data?.pageSize ?? PAGE_SIZE}
				hasNextPage={!!data?.nextCursor}
				onNextPage={() => paging.next(data?.nextCursor)}
				onPreviousPage={paging.previous}
				isLoading={isPending}
				isChangingPage={isPlaceholderData}
				filtered={!!nwid || !!addressSearch || !!status}
				renderMember={(event) => {
					const memberOf = data?.members?.[event.address] ?? [];
					return (
						<div className="flex flex-wrap items-baseline gap-x-3">
							<span className="font-mono text-xs">{event.address}</span>
							<div className="flex flex-wrap gap-x-3 text-xs text-gray-500">
								{memberOf.length === 0 ? <span>{t("noNetwork")}</span> : null}
								{memberOf.map((m) => (
									<Link
										key={m.nwid}
										className="link-hover link"
										href={
											m.organizationId
												? `/organization/${m.organizationId}/${m.nwid}`
												: `/network/${m.nwid}`
										}
									>
										{m.name || event.address} @ {m.networkName || m.nwid}
									</Link>
								))}
							</div>
						</div>
					);
				}}
			/>
		</MenuSectionDividerWrapper>
	);
};

/**
 * Admin settings for the member status log: the opt in switch, retention and
 * sample interval, and what the log can and cannot tell.
 */
const MemberStatusLogSettings = () => {
	const t = useTranslations("admin.settings.memberStatusLog");
	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();

	const { data: options, refetch: refetchOptions } = api.admin.getAllOptions.useQuery();
	const { refetch: refetchUserOptions } = api.settings.getAllOptions.useQuery();
	const { mutate: updateSettings, mutateAsync: updateSettingsAsync } =
		api.admin.updateMemberStatusLogSettings.useMutation({
			onSuccess: handleApiSuccess({ actions: [refetchOptions, refetchUserOptions] }),
			onError: handleApiError,
		});

	const enabled = options?.memberStatusLogEnabled === true;

	const submitNumber =
		(field: "retentionDays" | "sampleInterval", invalidMessage: string) =>
		async (values: Record<string, unknown>) => {
			const value = parseWholeNumber(values[field], LIMITS[field]);
			if (value === null) {
				toast.error(invalidMessage);
				return false;
			}
			try {
				await updateSettingsAsync({ [field]: value });
				return true;
			} catch {
				// reported by onError
				return false;
			}
		};

	return (
		<MenuSectionDividerWrapper title={t("title")} className="space-y-5">
			<div className="text-sm text-gray-400">
				<p>{t("description")}</p>
			</div>
			<div className="space-y-5">
				<div className="flex items-center justify-between gap-4">
					<label htmlFor="memberStatusLogEnabled">
						<p className="font-medium">
							{t("enable")}
							<span
								className={`badge badge-outline badge-sm ml-2 ${
									enabled ? "badge-success" : ""
								}`}
							>
								{enabled ? t("stateOn") : t("stateOff")}
							</span>
						</p>
						<p className="text-sm text-gray-500">{t("enableDescription")}</p>
					</label>
					<input
						id="memberStatusLogEnabled"
						type="checkbox"
						checked={enabled}
						className="checkbox-primary checkbox checkbox-sm"
						onChange={(e) => updateSettings({ enabled: e.target.checked })}
					/>
				</div>
				<EditableField
					isLoading={false}
					label={t("retention.label")}
					description={t("retention.description", LIMITS.retentionDays)}
					size="sm"
					placeholder={t("retention.value", {
						days: options?.memberStatusLogRetentionDays ?? 30,
					})}
					fields={[
						{
							name: "retentionDays",
							type: "number",
							placeholder: "30",
							value: options?.memberStatusLogRetentionDays,
						},
					]}
					submitHandler={submitNumber(
						"retentionDays",
						t("retention.invalid", LIMITS.retentionDays),
					)}
				/>
				<EditableField
					isLoading={false}
					label={t("interval.label")}
					description={t("interval.description", LIMITS.sampleInterval)}
					size="sm"
					placeholder={t("interval.value", {
						seconds: options?.memberStatusLogSampleInterval ?? 60,
					})}
					fields={[
						{
							name: "sampleInterval",
							type: "number",
							placeholder: "60",
							value: options?.memberStatusLogSampleInterval,
						},
					]}
					submitHandler={submitNumber(
						"sampleInterval",
						t("interval.invalid", LIMITS.sampleInterval),
					)}
				/>
				<div className="flex items-center justify-between gap-4">
					<label htmlFor="memberStatusLogConnectionChanges">
						<p className="font-medium">{t("connectionChanges.label")}</p>
						<p className="text-sm text-gray-500">{t("connectionChanges.description")}</p>
					</label>
					<input
						id="memberStatusLogConnectionChanges"
						type="checkbox"
						checked={options?.memberStatusLogConnectionChanges === true}
						className="checkbox-primary checkbox checkbox-sm"
						onChange={(e) => updateSettings({ logConnectionChanges: e.target.checked })}
					/>
				</div>
				<div className="rounded-lg border border-base-300 bg-base-200/50 p-4 text-sm">
					<p className="font-medium">{t("limits.title")}</p>
					<ul className="mt-2 list-disc space-y-1 pl-5 text-gray-500">
						<li>{t("limits.sampled")}</li>
						<li>{t("limits.shortDrops")}</li>
						<li>{t("limits.lateOffline")}</li>
						<li>{t("limits.relay")}</li>
						<li>{t("limits.localOnly")}</li>
					</ul>
				</div>
			</div>
		</MenuSectionDividerWrapper>
	);
};

export default MemberStatusLogSettings;
