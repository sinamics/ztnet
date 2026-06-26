import { useMemo, useState, useEffect } from "react";
import TimeAgo from "react-timeago";
import { api } from "~/utils/api";
import { useRouter } from "next/router";
import { useModalStore } from "~/utils/store";
import { useTranslations } from "next-intl";
import {
	useReactTable,
	getCoreRowModel,
	getSortedRowModel,
	flexRender,
	createColumnHelper,
	type SortingState,
	type ColumnDef,
} from "@tanstack/react-table";
import { type network_members } from "@prisma/client";

interface IProps {
	nwid: string;
	organizationId?: string;
}

export const DeletedNetworkMembersTable = ({ nwid, organizationId }: IProps) => {
	const { query } = useRouter();
	const t = useTranslations("networkById");
	const [sorting, setSorting] = useState<SortingState>([{ id: "id", desc: true }]);
	const callModal = useModalStore((state) => state.callModal);
	const utils = api.useUtils();

	const { data: networkById, refetch: refetchNetworkById } =
		api.network.getNetworkById.useQuery(
			{ nwid: nwid as string, central: false },
			{ enabled: !!query.id },
		);

	const invalidate = async () => {
		await utils.network.getNetworkById.invalidate({
			nwid: nwid as string,
			central: false,
		});
		void refetchNetworkById();
	};

	const { mutate: updateUser } = api.networkMember.UpdateDatabaseOnly.useMutation({
		onSuccess: invalidate,
	});
	const { mutate: deleteMember } = api.networkMember.delete.useMutation({
		onSuccess: invalidate,
	});
	const { mutate: bulkDeleteStashed } = api.networkMember.bulkDeleteStashed.useMutation({
		onSuccess: invalidate,
	});

	const columnHelper = createColumnHelper<network_members>();
	// biome-ignore lint/correctness/useExhaustiveDependencies: static column set
	const columns = useMemo<ColumnDef<network_members>[]>(
		() => [
			columnHelper.accessor("authorized", {
				header: () => <span>Authorized</span>,
				id: "authorized",
				cell: () => <span>No</span>,
			}),
			columnHelper.accessor("name", {
				header: () => <span>Member name</span>,
				id: "name",
				cell: (info) => info.getValue(),
			}),
			columnHelper.accessor("id", {
				header: () => <span>ID</span>,
				id: "id",
				cell: (info) => info.getValue(),
			}),
			columnHelper.accessor("creationTime", {
				header: () => <span>Created</span>,
				id: "creationTime",
				cell: (info) => {
					const creationDate = new Date(info.getValue());
					return <TimeAgo date={creationDate} title={creationDate} />;
				},
			}),
			columnHelper.display({
				header: () => <span>Conn Status</span>,
				id: "conStatus",
				cell: () => <span>stashed</span>,
			}),
			columnHelper.display({
				header: () => <span>Action</span>,
				id: "action",
				cell: ({
					row: {
						original: { nwid, id },
					},
				}) => (
					<span className="space-x-5">
						<button
							onClick={() => updateUser({ nwid, id, updateParams: { deleted: false } })}
							className="btn btn-primary btn-xs"
						>
							Re-Activate
						</button>
						<button
							onClick={() =>
								callModal({
									title: <p>Force delete {id}?</p>,
									description: (
										<p>
											By performing this action, the member will be removed from the
											database. To re-add the user in the future, you must manually enter
											their Member ID.
										</p>
									),
									yesAction: () => {
										void deleteMember(
											{ organizationId, nwid, id },
											{ onSuccess: () => void refetchNetworkById() },
										);
									},
								})
							}
							className="bg-red-800 btn btn-xs hover:bg-red-500"
						>
							Force Delete
						</button>
					</span>
				),
			}),
		],
		[],
	);

	const [data, setData] = useState<network_members[]>([]);
	useEffect(() => {
		setData((networkById?.zombieMembers as network_members[]) || []);
	}, [networkById?.zombieMembers]);

	const table = useReactTable<network_members>({
		data,
		columns,
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		state: { sorting },
	});

	return (
		<div className="pt-2">
			{data && data.length > 0 && (
				<div className="mb-4 flex justify-end">
					<button
						onClick={() =>
							callModal({
								title: <p>{t("deletedNetworkMembersTable.bulkDelete.modalTitle")}</p>,
								description: (
									<>
										<p>
											{t("deletedNetworkMembersTable.bulkDelete.modalDescription", {
												count: data.length,
											})}
										</p>
										<p className="mt-2 text-warning">
											<strong>
												{t("deletedNetworkMembersTable.bulkDelete.modalWarning")}
											</strong>
										</p>
									</>
								),
								yesAction: () => {
									bulkDeleteStashed({ nwid, organizationId });
								},
							})
						}
						className="btn btn-error btn-sm"
					>
						{t("deletedNetworkMembersTable.buttons.deleteAll", { count: data.length })}
					</button>
				</div>
			)}
			<div className="overflow-x-auto">
				<table className="w-full table-auto border border-gray-500">
					<thead className="bg-base-100">
						{table.getHeaderGroups().map((headerGroup) => (
							<tr key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<th
										key={header.id}
										colSpan={header.colSpan}
										className="py-3 pl-4 text-left"
									>
										{header.isPlaceholder ? null : (
											<div
												className={
													header.column.getCanSort() ? "cursor-pointer select-none" : ""
												}
												onClick={header.column.getToggleSortingHandler()}
											>
												{flexRender(header.column.columnDef.header, header.getContext())}
												{{ asc: " 🔼", desc: " 🔽" }[
													header.column.getIsSorted() as string
												] ?? null}
											</div>
										)}
									</th>
								))}
							</tr>
						))}
					</thead>
					<tbody className="divide-y divide-gray-200 border">
						{table.getRowModel().rows.map((row) => (
							<tr
								key={row.id}
								className={`items-center ${
									!row.original.authorized ? "border-dotted bg-error bg-opacity-20" : ""
								}`}
							>
								{row.getVisibleCells().map((cell) => (
									<td key={cell.id} className="py-1 pl-4">
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
};
