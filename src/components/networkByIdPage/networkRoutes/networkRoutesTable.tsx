import React, { useCallback, useMemo, useState } from "react";
import {
	useReactTable,
	getCoreRowModel,
	flexRender,
	type HeaderGroup,
	type Row,
	type RowData,
	getSortedRowModel,
	SortingState,
} from "@tanstack/react-table";
import { networkRoutesColumns } from "./collumns";
import { RoutesEntity } from "~/types/local/network";
import { MemberEntity } from "~/types/local/member";
import { api } from "~/utils/api";
import {
	useTrpcApiErrorHandler,
	useTrpcApiSuccessHandler,
} from "~/hooks/useTrpcApiHandler";
import { useRouter } from "next/router";
import { useEditableColumn } from "./routesEditCell";

declare module "@tanstack/react-table" {
	// biome-ignore lint/correctness/noUnusedVariables: module augmentation
	interface TableMeta<TData extends RowData> {
		// Live member list read by the Node Name cell at render time, so the column
		// resolves as soon as the members query loads (no row-model rebuild needed).
		members?: MemberEntity[];
	}
}

interface IProp {
	central?: boolean;
	organizationId?: string;
}

interface TableHeaderProps {
	headerGroups: HeaderGroup<RoutesEntity>[];
}

interface TableBodyProps {
	rows: Row<RoutesEntity>[];
	// Not rendered directly — the Node Name cell reads the member list live from
	// table `meta`. It's a prop purely so the memo below re-renders when members
	// load/change; `rows` is memoized on the routes and stays stable across member
	// refetches, which would otherwise leave Node Name blank until a route edit.
	members: MemberEntity[];
}

// Memoized table body component
const TableBody = React.memo<TableBodyProps>(
	({ rows }) => {
		return (
			<tbody>
				{rows.map((row) => (
					<tr key={row.id} className="hover:bg-gray-600/10">
						{row.getVisibleCells().map((cell) => (
							<td key={cell.id} className="px-4 text-sm">
								{flexRender(cell.column.columnDef.cell, cell.getContext())}
							</td>
						))}
					</tr>
				))}
			</tbody>
		);
	},
	// Re-render on a new row set OR a changed member list (see `members` above).
	(prev, next) => prev.rows === next.rows && prev.members === next.members,
);

TableBody.displayName = "TableBody";

// Memoized table header component
const TableHeader = React.memo<TableHeaderProps>(({ headerGroups }) => {
	return (
		<thead>
			{headerGroups.map((headerGroup) => (
				<tr key={headerGroup.id}>
					{headerGroup.headers.map((header) => (
						<th key={header.id} className="px-4 py-2 text-left">
							{header.isPlaceholder
								? null
								: flexRender(header.column.columnDef.header, header.getContext())}
						</th>
					))}
				</tr>
			))}
		</thead>
	);
});

TableHeader.displayName = "TableHeader";

export const NetworkRoutesTable = React.memo(
	({ central = false, organizationId }: IProp) => {
		const [sorting, setSorting] = useState<SortingState>([{ id: "id", desc: false }]);

		const handleApiError = useTrpcApiErrorHandler();
		const handleApiSuccess = useTrpcApiSuccessHandler();
		const utils = api.useUtils();

		const { query } = useRouter();
		const { data: networkById, refetch: refetchNetworkById } =
			api.network.getNetworkById.useQuery(
				{
					nwid: query.id as string,
					central,
				},
				{
					enabled: !!query.id,
				},
			);
		const { network } = networkById || {};

		// Members (for route node-name resolution) come from the dedicated DB-first
		// endpoint now; request all in one page.
		const { data: membersData } = api.network.getNetworkMembers.useQuery(
			{ nwid: query.id as string, central, pageSize: 100000 },
			{ enabled: !!query.id },
		);
		// Stable reference so the columns memo below only rebuilds when the member
		// list actually changes (not on every render).
		const members = useMemo(() => membersData?.members ?? [], [membersData?.members]);

		const { mutate: updateManageRoutes, isLoading: isUpdating } =
			api.network.managedRoutes.useMutation({
				onError: handleApiError,
				onSuccess: async () => {
					await utils.network.getNetworkById.invalidate({
						nwid: query.id as string,
						central,
					});
					handleApiSuccess({ actions: [refetchNetworkById] })();
				},
			});

		const deleteRoute = useCallback(
			(route: RoutesEntity) => {
				const _routes = [...((network?.routes as RoutesEntity[]) || [])];
				// Match on target AND via so deleting one route doesn't drop another
				// route that shares the same target (e.g. same target, different via).
				const newRouteArr = _routes.filter(
					(r) => !(r.target === route.target && (r.via ?? null) === (route.via ?? null)),
				);

				updateManageRoutes({
					updateParams: { routes: [...newRouteArr] },
					organizationId,
					nwid: query.id as string,
					central,
				});
			},
			[network?.routes, updateManageRoutes, organizationId, query.id, central],
		);

		const defaultColumn = useEditableColumn({ refetchNetworkById });

		// Memoize the routes data
		const data = useMemo(() => network?.routes ?? [], [network?.routes]);

		// Stable columns. The Node Name cell reads the member list live from table
		// `meta` (below), so columns don't need to rebuild when members load.
		const columns = useMemo(
			() => networkRoutesColumns(deleteRoute, isUpdating),
			[deleteRoute, isUpdating],
		);

		const table = useReactTable({
			data,
			columns,
			defaultColumn,
			onSortingChange: setSorting,
			getSortedRowModel: getSortedRowModel(),
			getCoreRowModel: getCoreRowModel(),
			// Live member list for the Node Name column; read by the cell at render
			// time so it refreshes the moment the members query resolves.
			meta: { members },
			state: {
				sorting,
				columnVisibility: { id: false, nodeName: !central, notes: !central },
			},
		});

		// Memoize the computed parts of the table
		const rows = table.getRowModel().rows;
		const headerGroups = table.getHeaderGroups();

		return (
			<div className="overflow-x-auto">
				<table
					role="routesTable"
					className="table-auto w-full min-w-[600px] border-collapse"
				>
					<TableHeader headerGroups={headerGroups} />
					<TableBody rows={rows} members={members} />
				</table>
			</div>
		);
	},
);

NetworkRoutesTable.displayName = "NetworkRoutesTable";
