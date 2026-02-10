import { type Table } from "@tanstack/react-table";
import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getLocalStorageItem, setLocalStorageItem } from "~/utils/localstorage";

const MIN_COUNT_TO_SHOW_FOOTER = 11;

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
const TableFooter = ({ table, page }: { table: Table<any>; page: string }) => {
	const t = useTranslations("commonTable");
	const [pageSize, setPageSize] = useState<string | number>(
		table.getState().pagination.pageSize,
	);

	const totalMembersCount = table?.options?.data?.length || 0;

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		const savedPageSize = getLocalStorageItem(`pageSize-${page}`, null);
		setPageSize(savedPageSize || 10);
		if (savedPageSize !== null) {
			table.setPageSize(
				savedPageSize === "all" ? totalMembersCount : Number(savedPageSize),
			);
		}
	}, [totalMembersCount]);

	const storeLocalState = (pageSize) => {
		table.setPageSize(pageSize === "all" ? totalMembersCount : Number(pageSize));
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
