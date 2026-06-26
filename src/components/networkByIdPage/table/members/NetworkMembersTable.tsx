import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	useReactTable,
	getCoreRowModel,
	flexRender,
	type RowData,
	type PaginationState,
} from "@tanstack/react-table";
import { api } from "~/utils/api";
import { useRouter } from "next/router";
import { convertRGBtoRGBA } from "~/utils/randomColor";
import { getLocalStorageItem } from "~/utils/localstorage";
import TableFooter from "~/components/shared/tableFooter";
import { type NetworkEntity } from "~/types/local/network";
import { useNetworkMembersSocket } from "~/hooks/useNetworkMembersSocket";
import { useMemberColumns } from "./useMemberColumns";
import { useTablePersistence } from "./hooks/useTablePersistence";
import { MembersToolbar } from "./components/MembersToolbar";
import { TABLE_MIN_WIDTH } from "./constants";

declare module "@tanstack/react-table" {
	// biome-ignore lint/correctness/noUnusedVariables: module augmentation
	interface TableMeta<TData extends RowData> {
		updateData: (rowIndex: number, columnId: string, value: unknown) => void;
		// Live data read by cells at render time (so columns stay stable across
		// refetches and cells avoid per-row query subscriptions).
		network?: NetworkEntity;
		deAuthorizeWarning?: boolean;
		showNotationMarker?: boolean;
	}
}

interface IProp {
	nwid: string;
	central: boolean;
	organizationId?: string;
}

// Columns the server can sort on (others are computed/array and disable sorting).
const SERVER_SORTABLE = new Set([
	"id",
	"name",
	"authorized",
	"physicalAddress",
	"ipAssignments",
]);

export const NetworkMembersTable = ({ nwid, central = false, organizationId }: IProp) => {
	const { query } = useRouter();
	// Live updates: server pushes a "changed" event over Socket.IO and we refetch.
	useNetworkMembersSocket(nwid, central);
	const [globalFilter, setGlobalFilter] = useState("");
	const {
		sorting,
		setSorting,
		showExtendedView,
		setShowExtendedView,
		columnVisibility,
		setColumnVisibility,
	} = useTablePersistence();
	const [pagination, setPagination] = useState<PaginationState>(() => ({
		pageIndex: 0,
		pageSize: getLocalStorageItem("pageSize-NetworkMembersTable", 10),
	}));

	// Network metadata (routes/v6 modes) + user options are shared (deduped) with
	// the page's query; members come from the paginated, DB-first endpoint.
	const { data: networkById } = api.network.getNetworkById.useQuery(
		{ nwid, central },
		{ enabled: !!query.id },
	);
	const { data: me } = api.auth.me.useQuery();

	const activeSort = sorting[0];
	const sortBy = activeSort && SERVER_SORTABLE.has(activeSort.id) ? activeSort.id : "id";
	const sortDir = activeSort?.desc ? "desc" : "asc";

	const { data: membersData, isLoading } = api.network.getNetworkMembers.useQuery(
		{
			nwid,
			central,
			page: pagination.pageIndex,
			pageSize: pagination.pageSize,
			search: globalFilter || undefined,
			// biome-ignore lint/suspicious/noExplicitAny: narrowed to the server enum above
			sortBy: sortBy as any,
			sortDir,
		},
		// Socket.IO drives live updates; this slow poll is just a safety net for a
		// dropped socket.
		{ enabled: !!query.id, refetchInterval: 60000 },
	);

	const totalCount = membersData?.totalCount ?? 0;
	const memoizedMembers = useMemo(
		() => membersData?.members ?? [],
		[membersData?.members],
	);

	// Reset to the first page whenever the filter or sort changes (these are
	// triggers, not values read in the effect).
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional triggers
	useEffect(() => {
		setPagination((p) => ({ ...p, pageIndex: 0 }));
	}, [globalFilter, sorting]);

	// Mirror the fetched page into local state, but freeze updates while an inline
	// editor is focused so a background refetch never rebuilds the row being typed
	// in. The latest snapshot is flushed when editing ends.
	const [data, setData] = useState(memoizedMembers);
	const editingCountRef = useRef(0);
	const pendingDataRef = useRef<typeof memoizedMembers | null>(null);

	const handleEditingChange = useCallback((editing: boolean) => {
		editingCountRef.current = Math.max(0, editingCountRef.current + (editing ? 1 : -1));
		if (editingCountRef.current === 0 && pendingDataRef.current) {
			setData(pendingDataRef.current);
			pendingDataRef.current = null;
		}
	}, []);

	useEffect(() => {
		if (editingCountRef.current > 0) {
			pendingDataRef.current = memoizedMembers;
		} else {
			setData(memoizedMembers);
		}
	}, [memoizedMembers]);

	const columns = useMemberColumns({
		nwid,
		central,
		organizationId,
		onEditingChange: handleEditingChange,
	});

	const table = useReactTable({
		data,
		columns,
		state: { pagination, sorting, globalFilter, columnVisibility },
		manualPagination: true,
		manualSorting: true,
		manualFiltering: true,
		pageCount: Math.max(1, Math.ceil(totalCount / Math.max(1, pagination.pageSize))),
		onPaginationChange: setPagination,
		onSortingChange: setSorting,
		onGlobalFilterChange: setGlobalFilter,
		onColumnVisibilityChange: setColumnVisibility,
		getCoreRowModel: getCoreRowModel(),
		meta: {
			updateData: (rowIndex, columnId, value) => {
				setData((old = []) =>
					old.map((row, index) =>
						index === rowIndex ? { ...old[rowIndex]!, [columnId]: value } : row,
					),
				);
			},
			network: networkById?.network as NetworkEntity | undefined,
			deAuthorizeWarning: !!me?.options?.deAuthorizeWarning,
			showNotationMarker: !!me?.options?.showNotationMarkerInTableRow,
		},
	});

	if (isLoading && data.length === 0) return <div>Loading</div>;

	const useNotationBg = !central && me?.options?.useNotationColorAsBg;

	return (
		<div className="rounded-xl pt-2">
			<MembersToolbar
				globalFilter={globalFilter}
				onGlobalFilterChange={setGlobalFilter}
				showExtendedView={showExtendedView}
				onToggleExtendedView={() => setShowExtendedView(!showExtendedView)}
			/>
			<div className="overflow-x-auto">
				<table
					role="membersTable"
					className={`w-full ${TABLE_MIN_WIDTH} table-auto divide-y divide-gray-400 border border-gray-500 text-center`}
				>
					<thead className="bg-base-100">
						{table.getHeaderGroups().map((headerGroup) => (
							<tr key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									const align = header.column.columnDef.meta?.style?.textAlign;
									return (
										<th
											key={header.id}
											colSpan={header.colSpan}
											className="bg-base-300/50 p-2"
											align={align}
											style={{
												minWidth: header.column.columnDef.minSize,
												maxWidth: header.column.columnDef.maxSize,
											}}
										>
											{header.isPlaceholder ? null : (
												<div
													className={
														header.column.getCanSort() ? "cursor-pointer select-none" : ""
													}
													onClick={header.column.getToggleSortingHandler()}
												>
													{flexRender(
														header.column.columnDef.header,
														header.getContext(),
													)}
													{{ asc: " 🔼", desc: " 🔽" }[
														header.column.getIsSorted() as string
													] ?? null}
												</div>
											)}
										</th>
									);
								})}
							</tr>
						))}
					</thead>
					<tbody className="divide-y divide-gray-500">
						{table.getRowModel().rows.map((row) => {
							const notation = row.original?.notations || [];
							return (
								<tr
									key={row.original.id}
									className={`items-center ${
										!row.original.authorized ? "border-dotted bg-red-400/10" : ""
									}`}
									style={
										useNotationBg && notation.length > 0
											? {
													backgroundColor: convertRGBtoRGBA(
														notation[0]?.label?.color as string,
														0.3,
													),
												}
											: {}
									}
								>
									{row.getVisibleCells().map((cell) => {
										const align = cell.column.columnDef.meta?.style?.textAlign;
										return (
											<td
												key={cell.id}
												className={`px-2 py-1 align-middle ${
													align === "left"
														? "text-left whitespace-normal break-words"
														: ""
												}`}
												style={{
													minWidth: cell.column.columnDef.minSize,
													maxWidth: cell.column.columnDef.maxSize,
												}}
											>
												{flexRender(cell.column.columnDef.cell, cell.getContext())}
											</td>
										);
									})}
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
			<div className="flex flex-col items-center justify-between py-3 sm:flex-row">
				<TableFooter table={table} page="NetworkMembersTable" totalCount={totalCount} />
			</div>
		</div>
	);
};
