import { type Table } from "@tanstack/react-table";
import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getLocalStorageItem, setLocalStorageItem } from "~/utils/localstorage";

const MIN_COUNT_TO_SHOW_FOOTER = 11;

// "Show all" maps to a single large page (the server's page-size cap) rather than
// the live row count. Using a fixed value lets the table fetch everything in one
// query at init — no intermediate small page, no second fetch, no flicker.
export const ALL_PAGE_SIZE = 100000;

const TableFooter = ({
	table,
	page,
	totalCount,
}: {
	// biome-ignore lint/suspicious/noExplicitAny: generic table
	table: Table<any>;
	page: string;
	// Server-side tables pass the total row count here; client-side tables omit
	// it and fall back to the (fully-loaded) data length.
	totalCount?: number;
}) => {
	const t = useTranslations("commonTable");
	const [pageSize, setPageSize] = useState<string | number>(
		table.getState().pagination.pageSize,
	);

	const totalMembersCount = totalCount ?? table?.options?.data?.length ?? 0;

	// Resolve a page-size selection to a valid positive integer. "all" maps to a
	// fixed large page (not the live count) so it never depends on data being
	// loaded yet — avoiding a 0/1 page size on first paint.
	const resolvePageSize = (value: string | number): number => {
		if (value === "all") return ALL_PAGE_SIZE;
		const n = Number(value);
		return Number.isInteger(n) && n > 0 ? n : 10;
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		const savedPageSize = getLocalStorageItem(`pageSize-${page}`, null);
		setPageSize(savedPageSize || 10);
		if (savedPageSize !== null) {
			table.setPageSize(resolvePageSize(savedPageSize));
		}
	}, [totalMembersCount]);

	const storeLocalState = (pageSize) => {
		table.setPageSize(resolvePageSize(pageSize));
		setPageSize(pageSize);
		setLocalStorageItem(`pageSize-${page}`, String(pageSize));
	};
	// dont show footer if there is only one page
	if (totalMembersCount < MIN_COUNT_TO_SHOW_FOOTER) return null;

	return (
		<div className="flex items-center justify-between gap-4">
			{/* Left side - Previous navigation */}
			<div className="flex items-center gap-2">
				<button
					className="btn btn-primary btn-outline btn-sm"
					onClick={() => table.setPageIndex(0)}
					disabled={!table.getCanPreviousPage()}
					title="First page"
				>
					{"<<"}
				</button>
				<button
					className="btn btn-primary btn-outline btn-sm"
					onClick={() => table.previousPage()}
					disabled={!table.getCanPreviousPage()}
					title="Previous page"
				>
					{"<"}
				</button>
			</div>

			{/* Center - Page size selector and page info */}
			<div className="flex items-center gap-4">
				<select
					className="select select-bordered select-sm"
					value={pageSize}
					onChange={(e) => {
						storeLocalState(e.target.value);
					}}
				>
					{[10, 20, 30, 40, 50, 100].map((pageSize) => (
						<option key={pageSize} value={pageSize}>
							{t("tableFooter.show")} {pageSize}
						</option>
					))}
					<option value="all">{t("tableFooter.show")} All</option>
				</select>

				<span className="flex items-center gap-1 text-xs text-base-content/70">
					<div>{t("tableFooter.page")}</div>
					<strong>
						{table.getState().pagination.pageIndex + 1} {t("tableFooter.of")}{" "}
						{table.getPageCount()}
					</strong>
				</span>
			</div>

			{/* Right side - Next navigation */}
			<div className="flex items-center gap-2">
				<button
					className="btn btn-primary btn-outline btn-sm"
					onClick={() => table.nextPage()}
					disabled={!table.getCanNextPage()}
					title="Next page"
				>
					{">"}
				</button>
				<button
					className="btn btn-primary btn-outline btn-sm"
					onClick={() => table.setPageIndex(table.getPageCount() - 1)}
					disabled={!table.getCanNextPage()}
					title="Last page"
				>
					{">>"}
				</button>
			</div>
		</div>
	);
};

export default TableFooter;
