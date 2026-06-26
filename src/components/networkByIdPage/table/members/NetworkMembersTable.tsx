import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	useReactTable,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	flexRender,
	type RowData,
} from "@tanstack/react-table";
import { api } from "~/utils/api";
import { useRouter } from "next/router";
import { useSkipper } from "~/hooks/useSkipper";
import { convertRGBtoRGBA } from "~/utils/randomColor";
import TableFooter from "~/components/shared/tableFooter";
import { type NetworkEntity } from "~/types/local/network";
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
		deAuthorizeWarning: boolean;
		showNotationMarker: boolean;
	}
}

interface IProp {
	nwid: string;
	central: boolean;
	organizationId?: string;
}

export const NetworkMembersTable = ({ nwid, central = false, organizationId }: IProp) => {
	const { query } = useRouter();
	const [globalFilter, setGlobalFilter] = useState("");
	const {
		sorting,
		setSorting,
		showExtendedView,
		setShowExtendedView,
		columnVisibility,
		setColumnVisibility,
	} = useTablePersistence();

	const { data: networkById, isLoading: loadingNetworks } =
		api.network.getNetworkById.useQuery({ nwid, central }, { enabled: !!query.id });

	const { data: me } = api.auth.me.useQuery();

	const memoizedMembers = useMemo(
		() => networkById?.members ?? [],
		[networkById?.members],
	);

	const [data, setData] = useState(networkById?.members ?? []);

	// Background polling refreshes member data every 10s. Applying that refresh
	// while a user is editing an inline cell rebuilds the row and drops focus, so
	// we freeze updates while any editor is focused and flush the latest snapshot
	// once editing ends.
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
	const [autoResetPageIndex, skipAutoResetPageIndex] = useSkipper();

	const table = useReactTable({
		data,
		columns,
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		autoResetPageIndex,
		state: { sorting, globalFilter, columnVisibility },
		onColumnVisibilityChange: setColumnVisibility,
		meta: {
			updateData: (rowIndex, columnId, value) => {
				skipAutoResetPageIndex();
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
		onGlobalFilterChange: setGlobalFilter,
		getFilteredRowModel: getFilteredRowModel(),
		debugTable: false,
	});

	if (loadingNetworks) return <div>Loading</div>;

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
				<TableFooter table={table} page="NetworkMembersTable" />
			</div>
		</div>
	);
};
