"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { DebouncedInput } from "~/components/elements/debouncedInput";
import {
	useReactTable,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	flexRender,
	type SortingState,
} from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { type network_members } from "@prisma/client";
import { getLocalStorageItem, setLocalStorageItem } from "~/utils/localstorage";
import { getTableColumns } from "./TableColumns";
import { useSkipper } from "~/hooks/useSkipper";
import TableFooter from "~/components/shared/tableFooter";

const LOCAL_STORAGE_KEY = "networkTableSorting";

type ColumnsType = {
	name: string;
	description: string;
	nwid: string;
	members: network_members[];
	networkMembers: network_members[];
	action: string;
	memberCounts: {
		display: string;
	};
};

export const UserNetworksTable = ({ tableData = [] }) => {
	const router = useRouter();
	const t = useTranslations();

	// Load initial state from localStorage or set to default
	const initialSortingState = getLocalStorageItem(LOCAL_STORAGE_KEY, [
		{ id: "nwid", desc: true },
	]);
	const [globalFilter, setGlobalFilter] = useState("");
	const [sorting, setSorting] = useState<SortingState>(initialSortingState);
	const [data, setData] = useState(tableData);
	const [autoResetPageIndex, skipAutoResetPageIndex] = useSkipper();

	// Get columns configuration
	const columns = getTableColumns(t);

	// Save to localStorage whenever sorting changes
	useEffect(() => {
		setLocalStorageItem(LOCAL_STORAGE_KEY, sorting);
	}, [sorting]);

	useEffect(() => {
		setData(tableData);
	}, [tableData]);

	const table = useReactTable({
		columns,
		data,
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		autoResetPageIndex,
		meta: {
			updateData: (rowIndex: number, columnId: string, value: any) => {
				skipAutoResetPageIndex();
				setData((old: ColumnsType[]) =>
					old.map((row, index) => {
						if (index === rowIndex) {
							return {
								...old[rowIndex]!,
								[columnId]: value,
							};
						}
						return row;
					}),
				);
			},
		},
		state: {
			sorting,
			globalFilter,
		},
		onGlobalFilterChange: setGlobalFilter,
		getFilteredRowModel: getFilteredRowModel(),
		debugTable: false,
	});

	const handleRowClick = (nwid: string) => {
		void router.push(`/network/${nwid}`);
	};

	return (
		<div className="inline-block w-full p-1.5 align-middle">
			<div>
				<DebouncedInput
					value={globalFilter ?? ""}
					onChange={(value) => setGlobalFilter(String(value))}
					className="font-lg border-block border p-2 shadow"
					placeholder={t("commonTable.search.networkSearchPlaceholder")}
				/>
			</div>
			<div className="overflow-auto rounded-lg border border-base-200/50">
				<table className="min-w-full divide-y text-center">
					<thead>
						{table.getHeaderGroups().map((headerGroup) => (
							<tr key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<th
										key={header.id}
										colSpan={header.colSpan}
										className="bg-base-300/50 p-2"
										style={{
											width: header.getSize() !== 150 ? header.getSize() : undefined,
										}}
									>
										{header.isPlaceholder ? null : (
											<div
												{...{
													className: header.column.getCanSort()
														? "cursor-pointer select-none"
														: "",
													onClick: header.column.getToggleSortingHandler(),
												}}
											>
												{flexRender(header.column.columnDef.header, header.getContext())}
												{{
													asc: " 🔼",
													desc: " 🔽",
												}[header.column.getIsSorted() as string] ?? null}
											</div>
										)}
									</th>
								))}
							</tr>
						))}
					</thead>
					<tbody className="divide-y">
						{table.getRowModel().rows.map((row) => (
							<tr
								key={row.id}
								onClick={() => handleRowClick(row?.original?.nwid as string)}
								className="cursor-pointer border-base-300/50 hover:bg-primary/5"
							>
								{row.getVisibleCells().map((cell) => (
									<td key={cell.id} className="p-2">
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
				<div className="flex flex-col items-center justify-between py-3 sm:flex-row">
					<TableFooter table={table} page="networkTable" />
				</div>
			</div>
		</div>
	);
};
