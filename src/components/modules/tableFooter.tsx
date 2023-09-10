import { type Table } from "@tanstack/react-table";
import React from "react";
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

// rome-ignore lint/suspicious/noExplicitAny: <explanation>
const TableFooter = ({ table }: { table: Table<any> }) => {
	// In your component...
	const t = useTranslations("tableFooter"); // use the 'footer' namespace

	return (
		<>
			<div className="space-x-3 p-2">
				<BackForwardBtn table={table} />
			</div>
			<div className="space-x-3 p-2">
				<select
					className="select select-bordered select-sm"
					value={
						table.getState().pagination.pageSize === table?.options?.data?.length
							? "all"
							: table.getState().pagination.pageSize
					}
					onChange={(e) => {
						const value = e.target.value;
						table.setPageSize(
							value === "all" ? table?.options?.data?.length : Number(value),
						);
					}}
				>
					{[10, 20, 30, 40, 50, 100].map((pageSize) => (
						<option key={pageSize} value={pageSize}>
							{t("show")} {pageSize}
						</option>
					))}
					<option value="all">All</option>
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
