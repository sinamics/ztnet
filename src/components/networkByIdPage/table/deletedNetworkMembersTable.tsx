import React, { useMemo, useState } from "react";
import TimeAgo from "react-timeago";
import { api } from "~/utils/api";
import { useRouter } from "next/router";
import { useModalStore } from "~/utils/store";
import {
	useReactTable,
	getCoreRowModel,
	// getPaginationRowModel,
	getSortedRowModel,
	flexRender,
	createColumnHelper,
	type SortingState,
	type ColumnDef,
} from "@tanstack/react-table";
import { type MemberEntity } from "~/types/local/member";

interface IProps {
	nwid: string;
	organizationId?: string;
}

export const DeletedNetworkMembersTable = ({ nwid, organizationId }: IProps) => {
	const { query } = useRouter();
	const [sorting, setSorting] = useState<SortingState>([
		{
			id: "id",
			desc: true,
		},
	]);
	const { callModal } = useModalStore((state) => state);
	const { data: networkById, refetch: refetchNetworkById } =
		api.network.getNetworkById.useQuery(
			{
				nwid: nwid as string,
				central: false,
			},
			{ enabled: !!query.id },
		);

	const { mutate: updateUser } = api.networkMember.UpdateDatabaseOnly.useMutation({
		onSuccess: () => {
			void refetchNetworkById();
		},
	});
	const { mutate: deleteMember } = api.networkMember.delete.useMutation({
		onSuccess: () => {
			void refetchNetworkById();
		},
	});
	const columnHelper = createColumnHelper<MemberEntity>();
	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	const columns = useMemo<ColumnDef<MemberEntity>[]>(
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
			columnHelper.accessor("conStatus", {
				header: () => <span>Conn Status</span>,
				id: "conStatus",
				cell: () => <span>stashed</span>,
			}),
			columnHelper.accessor("action", {
				header: () => <span>Action</span>,
				id: "action",
				cell: ({ row: { original: { nwid, id } } }) => {
					return (
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
											<>
												<p>
													By performing this action, the member will be removed from the
													database. To re-add the user in the future, you must manually
													enter their Member ID.
												</p>
											</>
										),
										yesAction: () => {
											void deleteMember(
												{
													organizationId,
													nwid,
													id,
												},
												{
													onSuccess: () => {
														void refetchNetworkById();
													},
												},
											);
										},
									})
								}
								className="bg-red-800 btn btn-xs hover:bg-red-500"
							>
								Force Delete
							</button>
						</span>
					);
				},
			}),
		],
		[],
	);
	const [data, setData] = useState(networkById.zombieMembers);
	const table = useReactTable({
		//@ts-expect-error
		data,
		columns,
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		// getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(), //order doesn't matter anymore!
		state: {
			sorting,
		},
		meta: {
			updateData: (rowIndex, columnId, value) => {
				// Skip page index reset until after next rerender
				// skipAutoResetPageIndex()
				setData((old: MemberEntity[] = []) =>
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
	});
	return (
		<span className="pt-2">
			<table className="w-full overflow-x-auto border border-gray-500">
				<thead className="bg-base-100">
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
											<th key={header.id} colSpan={header.colSpan} className="py-3 pl-4">
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
				<tbody className="divide-y divide-gray-200 border ">
					{
						// Loop over the table rows
						table
							.getRowModel()
							.rows.map((row) => (
								// Apply the row props
								<tr
									key={row.id}
									className={`items-center ${
										!row.original.authorized ? "border-dotted bg-error bg-opacity-20" : ""
									}`}
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
							))
					}
				</tbody>
			</table>
		</span>
	);
};
