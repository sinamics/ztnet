import { useEffect, useMemo, useState } from "react";
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

declare module "@tanstack/react-table" {
	// biome-ignore lint/correctness/noUnusedVariables: <explanation>
	interface TableMeta<TData extends RowData> {
		updateData: (rowIndex: number, columnId: string, value: unknown) => void;
	}
}

interface IProp {
	nwid: string;
	central: boolean;
	organizationId?: string;
}
const LOCAL_STORAGE_KEY = "membersTableSorting";
const EXTENDED_VIEW_KEY = "membersTableExtendedView";

export const NetworkMembersTable = ({ nwid, central = false, organizationId }: IProp) => {
	// Load initial state from localStorage or set to default
	const initialSortingState = getLocalStorageItem(LOCAL_STORAGE_KEY, [
		{ id: "id", desc: true },
	]);
	const initialExtendedViewState = getLocalStorageItem(EXTENDED_VIEW_KEY, false);

	// makeNetworkMemberData
	const t = useTranslations("networkById");
	const { query } = useRouter();
	const [globalFilter, setGlobalFilter] = useState("");
	const [sorting, setSorting] = useState<SortingState>(initialSortingState);
	const [showExtendedView, setShowExtendedView] = useState(initialExtendedViewState);

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

	// memorize the members for better performance.
	const memoizedMembers = useMemo(
		() => networkById?.members ?? [],
		[networkById?.members],
	);
	// const memoizedFakeMembers = useMemo(() => makeNetworkMemberData(100) ?? [], []);

	// Save to localStorage whenever sorting changes
	useEffect(() => {
		setLocalStorageItem(LOCAL_STORAGE_KEY, sorting);
	}, [sorting]);

	// Save to localStorage whenever extended view state changes
	useEffect(() => {
		setLocalStorageItem(EXTENDED_VIEW_KEY, showExtendedView);
	}, [showExtendedView]);

	useEffect(() => {
		setData(memoizedMembers);
	}, [memoizedMembers]);

	const [data, setData] = useState(networkById?.members ?? []);
	const columnsHeader = MemberHeaderColumns({ nwid, central, organizationId });
	const defaultColumn = MemberEditCell({ nwid, central, organizationId });
	const [autoResetPageIndex, skipAutoResetPageIndex] = useSkipper();

	const [columnVisibility, setColumnVisibility] = useState({
		notations: false,
		description: showExtendedView,
	});

	// Update column visibility when showExtendedView changes
	useEffect(() => {
		setColumnVisibility((prev) => ({
			...prev,
			description: showExtendedView,
		}));
	}, [showExtendedView]);

	const table = useReactTable({
		data,
		columns: columnsHeader,
		defaultColumn,
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		autoResetPageIndex,
		state: {
			sorting,
			globalFilter,
			columnVisibility,
		},
		onColumnVisibilityChange: setColumnVisibility,
		meta: {
			updateData: (rowIndex, columnId, value) => {
				// Skip page index reset until after next rerender
				skipAutoResetPageIndex();
				setData((old = []) =>
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
		onGlobalFilterChange: setGlobalFilter,
		getFilteredRowModel: getFilteredRowModel(),
		debugTable: false,
	});

	if (loadingNetworks) return <div>Loading</div>;
	return (
		<span className="rounded-xl pt-2">
			<div className="flex items-center justify-between py-2">
				<DebouncedInput
					value={globalFilter ?? ""}
					onChange={(value) => setGlobalFilter(String(value))}
					className="font-lg border-block border p-2 shadow flex-grow mr-4"
					placeholder={t("networkMembersTable.search.placeholder")}
				/>
				<button
					onClick={() => {
						setShowExtendedView(!showExtendedView);
					}}
					className={`btn btn-sm ${showExtendedView ? "btn-primary" : "btn-outline"}`}
					title={
						showExtendedView
							? t("networkMembersTable.toggles.hideExtendedView")
							: t("networkMembersTable.toggles.showExtendedView")
					}
					aria-label={
						showExtendedView
							? t("networkMembersTable.toggles.hideExtendedView")
							: t("networkMembersTable.toggles.showExtendedView")
					}
				>
					{showExtendedView ? (
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							strokeWidth={1.5}
							stroke="currentColor"
							className="w-4 h-4"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25"
							/>
						</svg>
					) : (
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							strokeWidth={1.5}
							stroke="currentColor"
							className="w-4 h-4"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
							/>
						</svg>
					)}
				</button>
			</div>
			<table
				role="membersTable"
				className="w-full divide-y divide-gray-400 overflow-x-auto border border-gray-500 text-center table-fixed"
			>
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
										headerGroup.headers?.map((header) => {
											// Define column widths for text columns
											const getColumnWidth = (columnId: string) => {
												switch (columnId) {
													case "name":
														return "w-32"; // 128px
													case "description":
														return "w-40"; // 160px
													case "authorized":
														return "w-16"; // 64px
													case "id":
														return "w-24"; // 96px
													case "ipAssignments":
														return "w-36"; // 144px
													case "physicalAddress":
														return "w-28"; // 112px
													case "conStatus":
														return "w-24"; // 96px
													case "action":
														return "w-32"; // 128px
													default:
														return "w-auto";
												}
											};

											return (
												<th
													key={header.id}
													colSpan={header.colSpan}
													className={`bg-base-300/50 p-2 ${getColumnWidth(header.column.id)}`}
													align={header.column.columnDef.meta?.style?.textAlign}
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
										})
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
							.rows?.map((row) => {
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
												.map((cell) => {
													// Add text wrapping classes for specific columns
													const getColumnWidth = (columnId: string) => {
														switch (columnId) {
															case "name":
																return "w-32"; // 128px
															case "description":
																return "w-40"; // 160px
															case "authorized":
																return "w-16"; // 64px
															case "id":
																return "w-24"; // 96px
															case "ipAssignments":
																return "w-36"; // 144px
															case "physicalAddress":
																return "w-28"; // 112px
															case "conStatus":
																return "w-24"; // 96px
															case "action":
																return "w-32"; // 128px
															default:
																return "w-auto";
														}
													};

													const isTextColumn =
														cell.column.id === "name" || cell.column.id === "description";
													// Use align-middle for better vertical centering and more compact rows
													const cellClassName = isTextColumn
														? `px-2 py-1 ${getColumnWidth(cell.column.id)} max-w-0 whitespace-normal break-words align-middle`
														: `px-2 py-1 ${getColumnWidth(cell.column.id)} align-middle`;

													return (
														// Apply the cell props
														<td key={cell.id} className={cellClassName}>
															{
																// Render the cell contents
																flexRender(cell.column.columnDef.cell, cell.getContext())
															}
														</td>
													);
												})
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
