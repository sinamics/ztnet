import { useRouter } from "next/router";
import { useMemo, useState, useEffect } from "react";
import { DebouncedInput } from "~/components/elements/debouncedInput";
import {
	useReactTable,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	flexRender,
	createColumnHelper,
	type SortingState,
} from "@tanstack/react-table";
import { useSkipper } from "../../hooks/useSkipper";
import { useTranslations } from "next-intl";
import { CentralMemberEntity } from "~/types/central/members";
import { getLocalStorageItem, setLocalStorageItem } from "~/utils/localstorage";
import TableFooter from "~/components/shared/tableFooter";

// import { makeNetworkData } from "../../utils/fakeData";
const TruncateText = ({ text }: { text: string }) => {
	if (!text) return null;
	const shouldTruncate = text?.length > 100;
	return (
		<div
			className={`text-left ${
				shouldTruncate
					? "max-w-[150px] truncate sm:max-w-xs md:overflow-auto md:whitespace-normal"
					: ""
			}`}
		>
			{text}
		</div>
	);
};

const LOCAL_STORAGE_KEY = "centralNetworkTableSorting";

export const OrganizationNetworkTable = ({ tableData = [] }) => {
	// Load initial state from localStorage or set to default
	const initialSortingState = getLocalStorageItem(LOCAL_STORAGE_KEY, [
		{ id: "id", desc: true },
	]);

	const router = useRouter();
	const t = useTranslations("networksTable");
	const [globalFilter, setGlobalFilter] = useState("");
	const [sorting, setSorting] = useState<SortingState>(initialSortingState);

	const columnHelper = createColumnHelper<CentralMemberEntity>();
	const columns = useMemo(
		() => [
			columnHelper.accessor("name", {
				cell: (info) => <span className="truncate">{info.getValue()}</span>,
				header: () => <span>{t("name")}</span>,
			}),
			columnHelper.accessor("description", {
				size: 300,
				cell: (info) => <TruncateText text={info.getValue()} />,
				header: () => <span>{t("description")}</span>,
			}),
			// columnHelper.accessor("nwid", {
			// 	cell: (info) => info.getValue(),
			// 	header: () => <span>{t("networkId")}</span>,
			// 	// footer: (info) => info.column.id,
			// }),
			columnHelper.accessor("totalMemberCount", {
				header: () => <span>{t("members")}</span>,
				cell: (info) => info.getValue(),
			}),
		],
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	// Save to localStorage whenever sorting changes
	useEffect(() => {
		setLocalStorageItem(LOCAL_STORAGE_KEY, sorting);
	}, [sorting]);

	useEffect(() => {
		setData(tableData);
	}, [tableData]);

	const [data, setData] = useState(tableData);
	const [autoResetPageIndex, skipAutoResetPageIndex] = useSkipper();
	const table = useReactTable({
		columns,
		data,
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		autoResetPageIndex,
		meta: {
			updateData: (rowIndex, columnId, value) => {
				// Skip page index reset until after next rerender
				skipAutoResetPageIndex();
				setData((old: CentralMemberEntity[]) =>
					old.map((row, index) => {
						if (index === rowIndex) {
							return {
								// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
		const orgId = router.query.orgid as string;
		void router.push(`/organization/${orgId}/${nwid}`);
	};

	return (
		<div className="inline-block w-full p-1.5 align-middle">
			<div>
				<DebouncedInput
					value={globalFilter ?? ""}
					onChange={(value) => setGlobalFilter(String(value))}
					className="font-lg border-block border p-2 shadow"
					placeholder={t("networkSearchPlaceholder")}
				/>
			</div>
			<div className="overflow-auto rounded-lg border border-base-200/50">
				<table className="min-w-full divide-y text-center">
					<thead className="">
						{table.getHeaderGroups().map((headerGroup) => (
							<tr key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									return (
										<th
											key={header.id}
											colSpan={header.colSpan}
											className="bg-base-300/50 p-2 "
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
													{flexRender(
														header.column.columnDef.header,
														header.getContext(),
													)}
													{{
														asc: " 🔼",
														desc: " 🔽",
													}[header.column.getIsSorted() as string] ?? null}
												</div>
											)}
										</th>
									);
								})}
							</tr>
						))}
					</thead>
					<tbody className="divide-y">
						{table.getRowModel().rows.map((row) => {
							return (
								<tr
									key={row.id}
									// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
									onClick={() => handleRowClick(row?.original.nwid as string)}
									className="cursor-pointer border-base-300/50 hover:bg-secondary hover:bg-opacity-25"
								>
									{row.getVisibleCells().map((cell) => {
										return (
											<td key={cell.id} className="p-2">
												{flexRender(cell.column.columnDef.cell, cell.getContext())}
											</td>
										);
									})}
								</tr>
							);
						})}
					</tbody>
				</table>
				<div className="flex flex-col items-center justify-between py-3 sm:flex-row">
					<TableFooter table={table} page="centralNetworkTable" />
				</div>
			</div>
		</div>
	);
};
