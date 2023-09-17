import { useEffect, useState } from "react";
import {
	useReactTable,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	flexRender,
	type RowData,
	type SortingState,
} from "@tanstack/react-table";
import { api } from "~/utils/api";
import { useRouter } from "next/router";
import { DebouncedInput } from "../../elements/debouncedInput";
import { useSkipper } from "../../../hooks/useSkipper";
import { convertRGBtoRGBA } from "~/utils/randomColor";
import { useTranslations } from "next-intl";
import { MemberHeaderColumns } from "./memberHeaderColumns";
import MemberEditCell from "./memberEditCell";
import { getLocalStorageItem, setLocalStorageItem } from "~/utils/localstorage";
import TableFooter from "~/components/shared/tableFooter";
// import { makeNetworkMemberData } from "~/utils/fakeData";

declare module "@tanstack/react-table" {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	interface TableMeta<TData extends RowData> {
		updateData: (rowIndex: number, columnId: string, value: unknown) => void;
	}
}

interface IProp {
	nwid: string;
	central: boolean;
}

const LOCAL_STORAGE_KEY = "membersTableSorting";

export const NetworkMembersTable = ({ nwid, central = false }: IProp) => {
	// Load initial state from localStorage or set to default
	const initialSortingState = getLocalStorageItem(LOCAL_STORAGE_KEY, [
		{ id: "id", desc: true },
	]);

	// makeNetworkMemberData
	const t = useTranslations("networkById");
	const { query } = useRouter();
	const [globalFilter, setGlobalFilter] = useState("");
	const [sorting, setSorting] = useState<SortingState>(initialSortingState);

	const { data: networkById, isLoading: loadingNetworks } =
		api.network.getNetworkById.useQuery(
			{
				nwid,
				central,
			},
			{
				enabled: !!query.id,
			},
		);

	const { data: me } = api.auth.me.useQuery();
	// Save to localStorage whenever sorting changes
	useEffect(() => {
		setLocalStorageItem(LOCAL_STORAGE_KEY, sorting);
	}, [sorting]);

	useEffect(() => {
		setData(networkById?.members ?? []);
	}, [networkById?.members]);

	// const [data, setData] = useState(() => makeNetworkMemberData(11));
	const [data, setData] = useState(networkById?.members ?? []);
	const columnsHeader = MemberHeaderColumns({ nwid, central });
	const defaultColumn = MemberEditCell({ nwid, central });
	const [autoResetPageIndex, skipAutoResetPageIndex] = useSkipper();
	const table = useReactTable({
		data,
		columns: columnsHeader,
		defaultColumn,
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		autoResetPageIndex,
		initialState: {
			columnVisibility: {
				notations: false,
			},
		},
		meta: {
			updateData: (rowIndex, columnId, value) => {
				// Skip page index reset until after next rerender
				skipAutoResetPageIndex();
				setData((old) =>
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
			// columnVisibility: { notations: false },
			sorting,
			globalFilter,
		},
		onGlobalFilterChange: setGlobalFilter,
		getFilteredRowModel: getFilteredRowModel(),
		debugTable: false,
	});

	if (loadingNetworks) return <div>Loading</div>;
	return (
		<span className="rounded-xl pt-2">
			<div className="py-1">
				<DebouncedInput
					value={globalFilter ?? ""}
					onChange={(value) => setGlobalFilter(String(value))}
					className="font-lg border-block border p-2 shadow"
					placeholder={t("networkMembersTable.search.placeholder")}
				/>
			</div>
			<table className="w-full divide-y divide-gray-400 overflow-x-auto border border-gray-500 text-center">
				<thead className="bg-base-100 ">
					{
						// Loop over the header rows
						table
							.getHeaderGroups()
							.map((headerGroup) => (
								// Apply the header row props
								<tr key={headerGroup.id}>
									{
										// Loop over the headers in each row
										headerGroup.headers.map((header) => (
											<th
												key={header.id}
												colSpan={header.colSpan}
												className="bg-base-300/50 p-2"
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
										))
									}
								</tr>
							))
					}
				</thead>
				<tbody className=" divide-y divide-gray-500">
					{
						// Loop over the table rows
						table
							.getRowModel()
							.rows.map((row) => {
								const notation = row.original?.notations || [];
								return (
									<tr
										key={row.original.id}
										className={`items-center ${
											!row.original.authorized ? "border-dotted bg-red-400/10" : ""
										}`}
										style={
											!central &&
											me?.options?.useNotationColorAsBg &&
											notation?.length > 0
												? {
														backgroundColor: convertRGBtoRGBA(
															notation[0]?.label?.color as string,
															0.3,
														),
												  }
												: {}
										}
									>
										{
											// Loop over the rows cells
											row
												.getVisibleCells()
												.map((cell) => (
													// Apply the cell props
													<td key={cell.id} className="py-1 pl-4">
														{
															// Render the cell contents
															flexRender(cell.column.columnDef.cell, cell.getContext())
														}
													</td>
												))
										}
									</tr>
								);
							})
					}
				</tbody>
			</table>
			<div className="flex flex-col items-center justify-between py-3 sm:flex-row">
				<TableFooter table={table} page="NetworkMembersTable" />
			</div>
		</span>
	);
};
