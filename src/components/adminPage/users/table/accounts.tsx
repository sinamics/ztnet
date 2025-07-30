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
import { useSkipper } from "../../../../hooks/useSkipper";
import { DebouncedInput } from "../../../elements/debouncedInput";
import { User } from "@prisma/client";
import UserOptionsModal from "../userOptionsModal";
import CreateUserModal from "../createUserModal";
import { getLocalStorageItem, setLocalStorageItem } from "~/utils/localstorage";
import TableFooter from "~/components/shared/tableFooter";
import TimeAgo from "react-timeago";
import { timeAgoFormatter } from "~/utils/time";
import Verified from "~/icons/verified";

type ExtendedUser = {
	action?: string;
	userGroup?: {
		name: string;
	};
	_count: {
		network: number;
	};
} & Partial<User>;

const LOCAL_STORAGE_KEY = "accountTableSorting";

export const Accounts = () => {
	// Load initial state from localStorage or set to default
	const initialSortingState = getLocalStorageItem(LOCAL_STORAGE_KEY, [
		{ id: "id", desc: true },
	]);

	const ct = useTranslations("commonTable");
	const t = useTranslations("admin");

	const [globalFilter, setGlobalFilter] = useState("");
	const callModal = useModalStore((state) => state.callModal);
	const [sorting, setSorting] = useState<SortingState>(initialSortingState);
	const { data: users, isLoading: loadingUsers } = api.admin.getUsers.useQuery({
		isAdmin: false,
	});

	const columnHelper = createColumnHelper<ExtendedUser>();
	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	const columns = useMemo<ColumnDef<ExtendedUser>[]>(
		() => [
			columnHelper.accessor("name", {
				header: () => <span>{ct("header.name")}</span>,
				id: "name",
				minSize: 350,
				cell: ({ getValue }) => {
					return getValue();
				},
			}),
			columnHelper.accessor("email", {
				header: () => <span>{ct("header.email")}</span>,
				id: "email",
				cell: ({ getValue, row }) => {
					const email = getValue();

					const mailIsVerified = row.original.emailVerified;

					return (
						<div className="flex items-center space-x-1">
							<div>{email}</div>
							{mailIsVerified && (
								<span title="Email verification completed">
									<Verified />
								</span>
							)}
						</div>
					);
				},
			}),
			columnHelper.accessor("id", {
				header: () => <span>{ct("header.id")}</span>,
				id: "id",
				minSize: 70,
				enableHiding: true,
			}),
			columnHelper.accessor("createdAt", {
				header: () => <span>{ct("header.created")}</span>,
				id: "createdAt",
				cell: ({ getValue }) => {
					const date = getValue();
					return date ? <TimeAgo date={date} formatter={timeAgoFormatter} /> : "N/A";
				},
			}),
			columnHelper.accessor("expiresAt", {
				header: () => <span>{ct("header.expires")}</span>,
				id: "expiresAt",
				cell: ({ getValue }) => {
					const date = getValue();
					return date ? (
						<TimeAgo date={date} formatter={timeAgoFormatter} />
					) : (
						t("users.users.table.values.never")
					);
				},
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
				header: () => <span>{ct("header.networks")}</span>,
				id: "Networks",
				minSize: 20,
				cell: ({ getValue }) => {
					return getValue();
				},
			}),
			columnHelper.accessor("lastseen", {
				header: () => <span>{ct("header.lastseen")}</span>,
				id: "lastseen",
				cell: ({ getValue }) => {
					const date = getValue();
					return date ? (
						<TimeAgo date={date} formatter={timeAgoFormatter} />
					) : (
						t("users.users.table.values.never")
					);
				},
			}),
			columnHelper.accessor("userGroupId", {
				header: () => <span>{ct("header.group")}</span>,
				id: "group",
				minSize: 80,
				cell: ({
					row: {
						original: { userGroup },
					},
				}) => {
					return userGroup?.name ?? "None";
				},
			}),
			columnHelper.accessor("isActive", {
				header: () => <span>{ct("header.account")}</span>,
				id: "isActive",
				minSize: 80,
				cell: ({ getValue }) => {
					return getValue()
						? t("users.users.table.accountStatus.active")
						: t("users.users.table.accountStatus.disabled");
				},
			}),
			columnHelper.accessor("role", {
				header: () => <span>{ct("header.role")}</span>,
				id: "role",
				minSize: 80,
				cell: ({ getValue }) => {
					return getValue();
				},
			}),
			columnHelper.accessor("action", {
				header: () => <span>{ct("header.actions")}</span>,
				id: "action",
				cell: ({ row: { original } }) => {
					return (
						<div className="space-x-2">
							<button
								onClick={() =>
									callModal({
										title: (
											<p>
												<span>{t("users.users.table.optionsModalTitle")} </span>
												<span className="text-primary">{`${
													original.name ? original.name : original.id
												}`}</span>
											</p>
										),
										rootStyle: "text-left max-w-2xl ",
										content: <UserOptionsModal userId={original?.id} />,
									})
								}
								className="btn btn-outline btn-xs rounded-sm"
							>
								{t("users.users.table.optionsButton")}
							</button>
						</div>
					);
				},
			}),
		],
		[],
	);

	// Save to localStorage whenever sorting changes
	useEffect(() => {
		setLocalStorageItem(LOCAL_STORAGE_KEY, sorting);
	}, [sorting]);

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
		initialState: { columnVisibility: { id: true } },
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
			<div className="mb-4">
				<p className="text-sm text-gray-500 mb-4">{t("users.users.description")}</p>
				<div className="flex justify-between items-center gap-4">
					<DebouncedInput
						value={globalFilter ?? ""}
						onChange={(value) => setGlobalFilter(String(value))}
						className="font-lg border-block border p-2 shadow flex-1"
						placeholder={t("users.users.table.searchPlaceholder")}
					/>
					<button
						onClick={() =>
							callModal({
								title: t("users.users.createUser.title"),
								showButtons: false,
								rootStyle: "text-left max-w-3xl",
								content: <CreateUserModal />,
							})
						}
						className="btn btn-primary btn-sm"
					>
						+ {t("users.users.createNewUserButton")}
					</button>
				</div>
			</div>

			<div className="inline-block">
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
						<TableFooter table={table} page="accountTable" />
					</div>
				</div>
			</div>
		</div>
	);
};
