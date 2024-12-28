import React, { useCallback, useMemo, useState } from "react";
import {
	useReactTable,
	getCoreRowModel,
	flexRender,
	type HeaderGroup,
	type Row,
	getSortedRowModel,
	SortingState,
} from "@tanstack/react-table";
import { networkRoutesColumns } from "./collumns";
import { RoutesEntity } from "~/types/local/network";
import { api } from "~/utils/api";
import {
	useTrpcApiErrorHandler,
	useTrpcApiSuccessHandler,
} from "~/hooks/useTrpcApiHandler";
import { useRouter } from "next/router";
import { useEditableColumn } from "./routesEditCell";

interface IProp {
	central?: boolean;
	organizationId?: string;
}

interface TableHeaderProps {
	headerGroups: HeaderGroup<RoutesEntity>[];
}

interface TableBodyProps {
	rows: Row<RoutesEntity>[];
}

// Memoized table body component
const TableBody = React.memo<TableBodyProps>(({ rows }) => {
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
});

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
		const { network, members } = networkById || {};

		const { mutate: updateManageRoutes, isLoading: isUpdating } =
			api.network.managedRoutes.useMutation({
				onError: handleApiError,
				onSuccess: handleApiSuccess({ actions: [refetchNetworkById] }),
			});

		const deleteRoute = useCallback(
			(route: RoutesEntity) => {
				const _routes = [...((network?.routes as RoutesEntity[]) || [])];
				const newRouteArr = _routes.filter((r) => r.target !== route.target);

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

		// Memoize columns
		const columns = networkRoutesColumns(deleteRoute, isUpdating, members);

		const table = useReactTable({
			data,
			columns,
			defaultColumn,
			onSortingChange: setSorting,
			getSortedRowModel: getSortedRowModel(),
			getCoreRowModel: getCoreRowModel(),
			state: {
				sorting,
				columnVisibility: { id: false },
			},
		});

		// Memoize the computed parts of the table
		const rows = table.getRowModel().rows;
		const headerGroups = table.getHeaderGroups();

		return (
			<table role="routesTable" className="table-auto w-full border-collapse">
				<TableHeader headerGroups={headerGroups} />
				<TableBody rows={rows} />
			</table>
		);
	},
);

NetworkRoutesTable.displayName = "NetworkRoutesTable";
