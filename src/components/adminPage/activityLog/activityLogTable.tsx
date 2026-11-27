import { useState } from "react";
import { useTranslations } from "next-intl";
import { DebouncedInput } from "~/components/elements/debouncedInput";
import { useEventPaging } from "~/components/memberStatusLog/useEventPaging";
import { api } from "~/utils/api";

const PAGE_SIZE = 25;
// select value for rows without an organization
const PERSONAL = "__personal__";
const ACTION_TYPES = ["NETWORK", "MEMBER", "ORGANIZATION"] as const;
type ActionType = (typeof ACTION_TYPES)[number];

/** Start of the day after a yyyy-mm-dd date, local time. */
const dayAfter = (date: string) => {
	const next = new Date(`${date}T00:00:00`);
	next.setDate(next.getDate() + 1);
	return next;
};

/** Every activity log row on the instance, for admins. */
const ActivityLogTable = () => {
	const t = useTranslations("admin.activityLog");
	const p = useTranslations("memberStatusLog.pagination");

	const [filters, setFilters] = useState({
		scope: "",
		userId: "",
		actionType: "",
		from: "",
		to: "",
		search: "",
	});
	const paging = useEventPaging();
	const setFilter = (key: keyof typeof filters, value: string) => {
		if (filters[key] === value) return;
		setFilters((previous) => ({ ...previous, [key]: value }));
		paging.reset();
	};
	const { scope, userId, actionType, from, to, search } = filters;

	const { data: organizations } = api.admin.getOrganizationQuotas.useQuery();
	const { data: users } = api.admin.getUsers.useQuery({ isAdmin: false });
	const { data, isPending, isPlaceholderData } = api.admin.getActivityLog.useQuery(
		{
			organizationId: scope === PERSONAL ? null : scope || undefined,
			userId: userId || undefined,
			actionType: (actionType || undefined) as ActionType | undefined,
			// whole days in the browser's time zone, the end day included
			from: from ? new Date(`${from}T00:00:00`) : undefined,
			to: to ? dayAfter(to) : undefined,
			search: search || undefined,
			cursor: paging.cursor,
			pageSize: PAGE_SIZE,
		},
		{ placeholderData: (previous) => previous },
	);
	const logs = data?.logs ?? [];
	const filtered = Object.values(filters).some(Boolean);

	return (
		<div className="space-y-4">
			<p className="text-sm text-gray-500">{t("description")}</p>
			<div className="flex flex-wrap items-end gap-3">
				<label className="form-control">
					<span className="label-text text-xs text-gray-500">
						{t("filters.organization")}
					</span>
					<select
						aria-label={t("filters.organization")}
						className="select select-bordered select-sm max-w-xs"
						value={scope}
						onChange={(e) => setFilter("scope", e.target.value)}
					>
						<option value="">{t("filters.all")}</option>
						<option value={PERSONAL}>{t("personal")}</option>
						{organizations?.map((org) => (
							<option key={org.id} value={org.id}>
								{org.orgName}
							</option>
						))}
					</select>
				</label>
				<label className="form-control">
					<span className="label-text text-xs text-gray-500">{t("filters.user")}</span>
					<select
						aria-label={t("filters.user")}
						className="select select-bordered select-sm max-w-xs"
						value={userId}
						onChange={(e) => setFilter("userId", e.target.value)}
					>
						<option value="">{t("filters.all")}</option>
						{users?.map((user) => (
							<option key={user.id} value={user.id}>
								{user.name} ({user.email})
							</option>
						))}
					</select>
				</label>
				<label className="form-control">
					<span className="label-text text-xs text-gray-500">
						{t("filters.actionType")}
					</span>
					<select
						aria-label={t("filters.actionType")}
						className="select select-bordered select-sm"
						value={actionType}
						onChange={(e) => setFilter("actionType", e.target.value)}
					>
						<option value="">{t("filters.all")}</option>
						{ACTION_TYPES.map((type) => (
							<option key={type} value={type}>
								{t(`actionTypes.${type}`)}
							</option>
						))}
					</select>
				</label>
				<label className="form-control">
					<span className="label-text text-xs text-gray-500">{t("filters.from")}</span>
					<input
						type="date"
						aria-label={t("filters.from")}
						className="input input-bordered input-sm"
						value={from}
						max={to || undefined}
						onChange={(e) => setFilter("from", e.target.value)}
					/>
				</label>
				<label className="form-control">
					<span className="label-text text-xs text-gray-500">{t("filters.to")}</span>
					<input
						type="date"
						aria-label={t("filters.to")}
						className="input input-bordered input-sm"
						value={to}
						min={from || undefined}
						onChange={(e) => setFilter("to", e.target.value)}
					/>
				</label>
				<label className="form-control">
					<span className="label-text text-xs text-gray-500">{t("filters.search")}</span>
					<DebouncedInput
						aria-label={t("filters.search")}
						placeholder={t("filters.searchPlaceholder")}
						maxLength={100}
						value={search}
						onChange={(value) => setFilter("search", String(value).trim())}
					/>
				</label>
			</div>
			{isPending ? (
				<div className="flex justify-center py-6">
					<span className="loading loading-dots loading-md" />
				</div>
			) : logs.length === 0 ? (
				<p className="py-6 text-center text-sm text-gray-500">
					{filtered ? t("emptyFiltered") : t("empty")}
				</p>
			) : (
				<div className="overflow-x-auto rounded-lg border border-base-300">
					<table className="table table-sm">
						<thead>
							<tr>
								<th>{t("columns.time")}</th>
								<th>{t("columns.user")}</th>
								<th>{t("columns.organization")}</th>
								<th>{t("columns.action")}</th>
							</tr>
						</thead>
						<tbody>
							{logs.map((log) => (
								<tr key={log.id} className="hover">
									<td className="whitespace-nowrap">
										{new Date(log.createdAt).toLocaleString()}
									</td>
									<td>
										<span className="font-medium">{log.performedBy.name}</span>
										<span className="ml-2 text-xs text-gray-500">
											{log.performedBy.email}
										</span>
									</td>
									<td>{log.organization?.orgName ?? t("personal")}</td>
									<td className="break-all">{log.action}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
			{paging.page > 0 || data?.nextCursor ? (
				<div className="flex items-center justify-end gap-2 text-xs text-base-content/70">
					<button
						type="button"
						className="btn btn-primary btn-outline btn-xs"
						onClick={paging.previous}
						disabled={paging.page <= 0 || isPlaceholderData}
					>
						{p("previous")}
					</button>
					<span>{p("pageOnly", { page: paging.page + 1 })}</span>
					<button
						type="button"
						className="btn btn-primary btn-outline btn-xs"
						onClick={() => paging.next(data?.nextCursor)}
						disabled={!data?.nextCursor || isPlaceholderData}
					>
						{p("next")}
					</button>
				</div>
			) : null}
		</div>
	);
};

export default ActivityLogTable;
