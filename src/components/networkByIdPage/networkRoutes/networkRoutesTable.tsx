import React from "react";
import { useReactTable, getCoreRowModel, flexRender } from "@tanstack/react-table";
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

export const NetworkRoutesTable = ({ central = false, organizationId }: IProp) => {
	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();

	const { query } = useRouter();
	const { data: networkById, refetch: refecthNetworkById } =
		api.network.getNetworkById.useQuery(
			{
				nwid: query.id as string,
				central,
			},
			{ enabled: !!query.id },
		);
	const { network, members } = networkById || {};

	const { mutate: updateManageRoutes, isLoading: isUpdating } =
		api.network.managedRoutes.useMutation({
			onError: handleApiError,
			onSuccess: handleApiSuccess({ actions: [refecthNetworkById] }),
		});

	const deleteRoute = (route: RoutesEntity) => {
		const _routes = [...(network.routes as RoutesEntity[])];
		const newRouteArr = _routes.filter((r) => r.target !== route.target);

		updateManageRoutes({
			updateParams: { routes: [...newRouteArr] },
			organizationId,
			nwid: query.id as string,
			central,
		});
	};

	const defaultColumn = useEditableColumn({ refecthNetworkById });

	const table = useReactTable({
		data: network?.routes ?? [],
		columns: networkRoutesColumns(deleteRoute, isUpdating, members),
		defaultColumn,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<table className="table-auto w-full border-collapse">
			<thead>
				{table.getHeaderGroups().map((headerGroup) => (
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
			<tbody>
				{table.getRowModel().rows.map((row) => (
					<tr key={row.id} className="hover:bg-gray-600/10">
						{row.getVisibleCells().map((cell) => (
							<td key={cell.id} className="px-4 py-2">
								{flexRender(cell.column.columnDef.cell, cell.getContext())}
							</td>
						))}
					</tr>
				))}
			</tbody>
		</table>
	);
};
