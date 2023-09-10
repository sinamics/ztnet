import { type Table } from "@tanstack/react-table";
import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

const BackForwardBtn = ({ table }: { table: Table<unknown> }) => (
	<>
		<button
			className="btn btn-primary btn-outline btn-sm"
			onClick={() => table.setPageIndex(0)}
			disabled={!table.getCanPreviousPage()}
		>
			{"<<"}
		</button>
		<button
			className="btn btn-primary btn-outline btn-sm"
			onClick={() => table.previousPage()}
			disabled={!table.getCanPreviousPage()}
		>
			{"<"}
		</button>
		<button
			className="btn btn-primary btn-outline btn-sm"
			onClick={() => table.nextPage()}
			disabled={!table.getCanNextPage()}
		>
			{">"}
		</button>
		<button
			className="btn btn-primary btn-outline btn-sm"
			onClick={() => table.setPageIndex(table.getPageCount() - 1)}
			disabled={!table.getCanNextPage()}
		>
			{">>"}
		</button>
	</>
);

const MIN_COUNT_TO_SHOW_FOOTER = 11;

// rome-ignore lint/suspicious/noExplicitAny: <explanation>
const TableFooter = ({ table, page }: { table: Table<any>; page: string }) => {
	const t = useTranslations("tableFooter"); // use the 'footer' namespace
	const [pageSize, setPageSize] = useState<string | number>(
		table.getState().pagination.pageSize,
	);
	const totalMembersCount = table?.options?.data?.length || 0;

	useEffect(() => {
		const savedPageSize = localStorage.getItem(`pageSize-${page}`);
		setPageSize(savedPageSize || 10);
		if (savedPageSize !== null) {
			table.setPageSize(
				savedPageSize === "all" ? table?.options?.data?.length : Number(savedPageSize),
			);
		}
	}, []);

	const storeLocalState = (pageSize) => {
		table.setPageSize(pageSize === "all" ? totalMembersCount : Number(pageSize));
		setPageSize(pageSize);
		localStorage.setItem(`pageSize-${page}`, String(pageSize));
	};
	// dont show footer if there is only one page
	if (totalMembersCount < MIN_COUNT_TO_SHOW_FOOTER) return null;

	return (
		<>
			<div className="space-x-3 p-2">
				<BackForwardBtn table={table} />
			</div>
			<div className="space-x-3 p-2">
				<select
					className="select select-bordered select-sm"
					value={pageSize}
					onChange={(e) => {
						storeLocalState(e.target.value);
					}}
				>
					{[10, 20, 30, 40, 50, 100].map((pageSize) => (
						<option key={pageSize} value={pageSize}>
							{t("show")} {pageSize}
						</option>
					))}
					<option value="all">Show All</option>
				</select>
			</div>
			<div className="space-x-3 p-2">
				<span className="flex items-center gap-1 text-xs">
					<div>{t("page")}</div>
					<strong>
						{table.getState().pagination.pageIndex + 1} {t("of")} {table.getPageCount()}
					</strong>
				</span>
			</div>
		</>
	);
};

export default TableFooter;
