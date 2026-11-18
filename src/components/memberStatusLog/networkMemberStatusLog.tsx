import { useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "~/utils/api";
import { useEventPaging } from "./useEventPaging";
import {
	type MemberStatus,
	StatusEventFilters,
	StatusEventTable,
} from "./statusEventTable";

interface Props {
	nwid: string;
	/** Show the log of this one member and hide the member filter. */
	memberId?: string;
	pageSize?: number;
}

/**
 * Member status log of one network. Renders nothing when the instance admin
 * has not enabled the log.
 */
export const NetworkMemberStatusLog = ({ nwid, memberId, pageSize = 25 }: Props) => {
	const t = useTranslations("memberStatusLog");
	const [member, setMember] = useState("");
	const [status, setStatus] = useState<MemberStatus | "">("");
	const [includeConnectionChanges, setIncludeConnectionChanges] = useState(false);
	const paging = useEventPaging();

	const { data: globalOptions } = api.settings.getAllOptions.useQuery();
	const enabled = globalOptions?.memberStatusLogEnabled === true;
	// The Direct/Relay filter only makes sense while those changes are logged.
	const showConnectionChanges = globalOptions?.memberStatusLogConnectionChanges === true;

	const { data, isPending, isPlaceholderData } =
		api.network.getMemberStatusEvents.useQuery(
			{
				nwid,
				memberId: memberId || member || undefined,
				status: status || undefined,
				includeConnectionChanges: showConnectionChanges && includeConnectionChanges,
				cursor: paging.cursor,
				pageSize,
			},
			{
				enabled: enabled && !!nwid,
				refetchInterval: 30000,
				placeholderData: (previous) => previous,
			},
		);

	if (!enabled || data?.enabled === false) return null;

	// Any filter change goes back to the first page.
	const withPageReset =
		<T,>(setter: (value: T) => void) =>
		(value: T) => {
			setter(value);
			paging.reset();
		};

	return (
		<div className="w-full space-y-4">
			<p className="text-sm text-gray-500">
				{memberId ? t("memberDescription") : t("description")}
			</p>
			<StatusEventFilters
				status={status}
				onStatusChange={withPageReset(setStatus)}
				includeConnectionChanges={includeConnectionChanges}
				onIncludeConnectionChangesChange={withPageReset(setIncludeConnectionChanges)}
				showConnectionChanges={showConnectionChanges}
			>
				{memberId ? null : (
					<label className="form-control">
						<span className="label-text text-xs text-gray-500">
							{t("filters.member")}
						</span>
						<select
							aria-label={t("filters.member")}
							className="select select-bordered select-sm max-w-xs"
							value={member}
							onChange={(e) => withPageReset(setMember)(e.target.value)}
						>
							<option value="">{t("filters.allMembers")}</option>
							{data?.members?.map((m) => (
								<option key={m.id} value={m.id}>
									{m.name ? `${m.name} (${m.id})` : m.id}
								</option>
							))}
						</select>
					</label>
				)}
			</StatusEventFilters>
			<StatusEventTable
				events={data?.events ?? []}
				total={data?.total ?? 0}
				totalIsCapped={data?.totalIsCapped}
				page={paging.page}
				pageSize={data?.pageSize ?? pageSize}
				hasNextPage={!!data?.nextCursor}
				onNextPage={() => paging.next(data?.nextCursor)}
				onPreviousPage={paging.previous}
				isLoading={isPending}
				isChangingPage={isPlaceholderData}
				filtered={!!member || !!status}
				hideMember={!!memberId}
			/>
		</div>
	);
};
