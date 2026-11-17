import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import cn from "classnames";

export type MemberStatus = "OFFLINE" | "DIRECT" | "RELAY";

export interface StatusEvent {
	id: number;
	address: string;
	fromStatus: MemberStatus;
	toStatus: MemberStatus;
	physicalAddress: string | null;
	createdAt: Date | string;
	memberName?: string | null;
}

export const StatusBadge = ({ status }: { status: MemberStatus }) => {
	const t = useTranslations("memberStatusLog");
	return (
		<span
			className={cn("badge badge-sm rounded-md font-medium", {
				"badge-error badge-outline": status === "OFFLINE",
				"badge-success": status === "DIRECT",
				"badge-warning": status === "RELAY",
			})}
		>
			{t(`status.${status}`)}
		</span>
	);
};

interface FiltersProps {
	status: MemberStatus | "";
	onStatusChange: (status: MemberStatus | "") => void;
	includeConnectionChanges: boolean;
	onIncludeConnectionChangesChange: (include: boolean) => void;
	/** Extra filters, rendered before the shared ones. */
	children?: ReactNode;
}

/** Status and Direct/Relay filters shared by every view of the log. */
export const StatusEventFilters = ({
	status,
	onStatusChange,
	includeConnectionChanges,
	onIncludeConnectionChangesChange,
	children,
}: FiltersProps) => {
	const t = useTranslations("memberStatusLog");
	return (
		<div className="flex flex-wrap items-end gap-3">
			{children}
			<label className="form-control">
				<span className="label-text text-xs text-gray-500">{t("filters.status")}</span>
				<select
					aria-label={t("filters.status")}
					className="select select-bordered select-sm"
					value={status}
					onChange={(e) => onStatusChange(e.target.value as MemberStatus | "")}
				>
					<option value="">{t("filters.allStatuses")}</option>
					<option value="OFFLINE">{t("status.OFFLINE")}</option>
					<option value="DIRECT">{t("status.DIRECT")}</option>
					<option value="RELAY">{t("status.RELAY")}</option>
				</select>
			</label>
			<label className="flex cursor-pointer items-center gap-2 pb-1">
				<input
					type="checkbox"
					className="checkbox checkbox-primary checkbox-sm"
					checked={includeConnectionChanges}
					onChange={(e) => onIncludeConnectionChangesChange(e.target.checked)}
				/>
				<span className="text-sm">{t("filters.includeConnectionChanges")}</span>
			</label>
		</div>
	);
};

interface TableProps {
	events: StatusEvent[];
	total: number;
	page: number;
	pageSize: number;
	onPageChange: (page: number) => void;
	isLoading?: boolean;
	/** True when a filter is active, picks the right empty message. */
	filtered?: boolean;
	/** Hide the member column, for a log that is already about one member. */
	hideMember?: boolean;
	/** Overrides how the member is shown. Default is name and address. */
	renderMember?: (event: StatusEvent) => ReactNode;
}

export const StatusEventTable = ({
	events,
	total,
	page,
	pageSize,
	onPageChange,
	isLoading,
	filtered,
	hideMember,
	renderMember,
}: TableProps) => {
	const t = useTranslations("memberStatusLog");
	const pageCount = Math.max(1, Math.ceil(total / pageSize));

	if (isLoading) {
		return (
			<div className="flex justify-center py-6">
				<span className="loading loading-dots loading-md" />
			</div>
		);
	}

	if (events.length === 0) {
		return (
			<p className="py-6 text-center text-sm text-gray-500">
				{filtered ? t("emptyFiltered") : t("empty")}
			</p>
		);
	}

	return (
		<div className="space-y-3">
			<div className="overflow-x-auto rounded-lg border border-base-300">
				<table className="table table-sm">
					<thead>
						<tr>
							<th>{t("columns.time")}</th>
							{hideMember ? null : <th>{t("columns.member")}</th>}
							<th>{t("columns.change")}</th>
							<th>{t("columns.physicalAddress")}</th>
						</tr>
					</thead>
					<tbody>
						{events.map((event) => (
							<tr key={event.id} className="hover">
								<td className="whitespace-nowrap">
									{new Date(event.createdAt).toLocaleString()}
								</td>
								{hideMember ? null : (
									<td>
										{renderMember ? (
											renderMember(event)
										) : (
											<>
												<span className="font-medium">
													{event.memberName || event.address}
												</span>
												{event.memberName ? (
													<span className="ml-2 font-mono text-xs text-gray-500">
														{event.address}
													</span>
												) : null}
											</>
										)}
									</td>
								)}
								<td className="whitespace-nowrap">
									<span className="inline-flex items-center gap-2">
										<StatusBadge status={event.fromStatus} />
										<span aria-hidden="true" className="text-gray-500">
											→
										</span>
										<span className="sr-only">{t("changedTo")}</span>
										<StatusBadge status={event.toStatus} />
									</span>
								</td>
								<td className="font-mono text-xs">{event.physicalAddress || ""}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<div className="flex items-center justify-between gap-4 text-xs text-base-content/70">
				<span>
					{t("pagination.range", {
						from: page * pageSize + 1,
						to: Math.min(total, (page + 1) * pageSize),
						total,
					})}
				</span>
				{pageCount > 1 ? (
					<div className="flex items-center gap-2">
						<button
							type="button"
							className="btn btn-primary btn-outline btn-xs"
							onClick={() => onPageChange(page - 1)}
							disabled={page <= 0}
						>
							{t("pagination.previous")}
						</button>
						<span>{t("pagination.page", { page: page + 1, pages: pageCount })}</span>
						<button
							type="button"
							className="btn btn-primary btn-outline btn-xs"
							onClick={() => onPageChange(page + 1)}
							disabled={page + 1 >= pageCount}
						>
							{t("pagination.next")}
						</button>
					</div>
				) : null}
			</div>
		</div>
	);
};
