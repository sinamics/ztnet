import { useMemo, useState, useEffect } from "react";
import {
	useReactTable,
	getCoreRowModel,
	getSortedRowModel,
	flexRender,
	createColumnHelper,
	type ColumnDef,
	type SortingState,
	getPaginationRowModel,
	getFilteredRowModel,
} from "@tanstack/react-table";
import { api } from "~/utils/api";
import { useModalStore } from "~/utils/store";
import { useTranslations } from "next-intl";
import { useSkipper } from "../elements/useSkipper";
import { DebouncedInput } from "../elements/debouncedInput";
import TableFooter from "./tableFooter";
import { User } from "@prisma/client";
import UserOptionsModal from "../admin/users/userOptionsModal";

type ExtendedUser = {
	action?: string;
	userGroup?: {
		name: string;
	};
	_count: {
		network: number;
	};
} & Partial<User>;

export const Accounts = () => {
	const t = useTranslations("admin");
	const [globalFilter, setGlobalFilter] = useState("");
	const { callModal } = useModalStore((state) => state);
	const [sorting, setSorting] = useState<SortingState>([
		{
			id: "id",
			desc: false,
		},
	]);
	const { data: users, isLoading: loadingUsers } = api.admin.getUsers.useQuery({
		isAdmin: false,
	});

	const columnHelper = createColumnHelper<ExtendedUser>();
	const columns = useMemo<ColumnDef<ExtendedUser>[]>(
		() => [
			columnHelper.accessor("id", {
				header: () => <span>{t("users.users.table.id")}</span>,
				id: "id",
				minSize: 70,
			}),
			columnHelper.accessor("name", {
				header: () => <span>{t("users.users.table.memberName")}</span>,
				id: "name",
				minSize: 350,
				cell: ({ getValue }) => {
					return getValue();
				},
			}),
			columnHelper.accessor("email", {
				header: () => <span>{t("users.users.table.email")}</span>,
				id: "email",
			}),
			// columnHelper.accessor("emailVerified", {
			// 	header: () => <span>{t("users.users.table.emailVerified")}</span>,
			// 	id: "emailVerified",
			// 	size: 140,
			// 	cell: ({ getValue }) => {
			// 		if (getValue()) {
			// 			return t("users.users.table.emailVerifiedYes");
			// 		}

			// 		return t("users.users.table.emailVerifiedNo");
			// 	},
			// }),
			columnHelper.accessor((row: ExtendedUser) => row._count?.network, {
				header: () => <span>{t("users.users.table.networks")}</span>,
				id: "Networks",
				minSize: 20,
				cell: ({ getValue }) => {
					return getValue();
				},
			}),
			columnHelper.accessor("userGroupId", {
				header: () => <span>{t("users.users.table.group")}</span>,
				id: "group",
				minSize: 80,
				cell: ({ row: { original: { userGroup } } }) => {
					return userGroup?.name ?? "None";
				},
			}),
			columnHelper.accessor("role", {
				header: () => <span>{t("users.users.table.role")}</span>,
				id: "role",
				minSize: 80,
				cell: ({ getValue }) => {
					return getValue();
				},
			}),
			columnHelper.accessor("action", {
				header: () => <span>Actions</span>,
				id: "action",
				cell: ({ row: { original } }) => {
					return (
						<div className="space-x-2">
							<button
								onClick={() =>
									callModal({
										title: (
											<p>
												<span>Options for user </span>
												<span className="text-primary">{`${
													original.name ? original.name : original.id
												}`}</span>
											</p>
										),
										rootStyle: "text-left",
										content: <UserOptionsModal userId={original?.id} />,
									})
								}
								className="btn btn-outline btn-xs rounded-sm"
							>
								Options
							</button>
						</div>
					);
				},
			}),
		],
		[],
	);

	useEffect(() => {
		setData(users ?? []);
	}, [users]);

	const [data, setData] = useState<ExtendedUser[]>(users ?? []);

	const [autoResetPageIndex, skipAutoResetPageIndex] = useSkipper();
	const table = useReactTable({
		data,
		columns,
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		autoResetPageIndex,
		meta: {
			updateData: (rowIndex, columnId, value) => {
				// Skip page index reset until after next rerender
				skipAutoResetPageIndex();
				setData((old: ExtendedUser[]) =>
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
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		state: {
			sorting,
			globalFilter,
		},
	});

	if (loadingUsers) {
		return (
			<div className="flex flex-col items-center justify-center">
				<h1 className="text-center text-2xl font-semibold">
					<progress className="progress progress-primary w-56"></progress>
				</h1>
			</div>
		);
	}
	return (
		<div className="overflow-x-auto w-full">
			<div className="pb-5">
				<p className="text-sm text-gray-500">{t("users.users.description")}</p>
			</div>
			<div className="inline-block py-5 ">
				<div className="p-2">
					<DebouncedInput
						value={globalFilter ?? ""}
						onChange={(value) => setGlobalFilter(String(value))}
						className="font-lg border-block border p-2 shadow"
						placeholder="search users"
					/>
				</div>
				<div className="overflow-hidden rounded-lg border w-full">
					<table className="overflow-x-auto text-center  table-wrapper divide-y divide-gray-400">
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
												headerGroup.headers.map((header) => {
													return (
														<th
															{...{
																style: {
																	width: header.getSize(),
																},
															}}
															key={header.id}
															colSpan={header.colSpan}
															scope="col"
															className="bg-base-300/50 py-2 pl-4 text-xs"
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
						<tbody className=" divide-y divide-gray-200">
							{
								// Loop over the table rows
								table
									.getRowModel()
									.rows.map((row) => (
										<tr key={row.original.id} className={"items-center"}>
											{
												// Loop over the rows cells
												row
													.getVisibleCells()
													.map((cell) => (
														// Apply the cell props

														<td
															{...{
																style: {
																	width: cell.column.getSize(),
																},
															}}
															key={cell.id}
															className="py-1 pl-4"
														>
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
					<div className="flex flex-col items-center justify-between py-3 sm:flex-row">
						<TableFooter table={table} />
					</div>
				</div>
			</div>
		</div>
	);
};
