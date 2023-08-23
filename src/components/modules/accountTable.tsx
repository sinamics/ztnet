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
import { type ErrorData } from "~/types/errorHandling";
import toast from "react-hot-toast";
import { useModalStore } from "~/utils/store";
import { useTranslations } from "next-intl";
import { useSkipper } from "../elements/useSkipper";
import { DebouncedInput } from "../elements/debouncedInput";
import TableFooter from "./tableFooter";
import { User } from "@prisma/client";
import UserOptionsModal from "../admin/users/userOptionsModal";

type ExtendedUser = {
	action?: string;
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
	const {
		data: members,
		refetch: refetchUsers,
		isLoading: loadingUsers,
	} = api.admin.getUsers.useQuery({ isAdmin: false });

	const { mutate: assignUserGroup } = api.admin.assignUserGroup.useMutation({
		onError: (error) => {
			if ((error.data as ErrorData)?.zodError) {
				const fieldErrors = (error.data as ErrorData)?.zodError.fieldErrors;
				for (const field in fieldErrors) {
					toast.error(`${fieldErrors[field].join(", ")}`);
				}
			} else if (error.message) {
				toast.error(error.message);
			} else {
				toast.error("An unknown error occurred");
			}
		},
		onSuccess: () => {
			toast.success("Group added successfully");
		},
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
			}),
			columnHelper.accessor("role", {
				header: () => <span>{t("users.users.table.role")}</span>,
				id: "role",
				minSize: 80,
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
										content: <UserOptionsModal userId={original.id} />,
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

	// Create an editable cell renderer
	const defaultColumn: Partial<ColumnDef<ExtendedUser>> = {
		cell: ({
			getValue,
			row: { original: { id: userid, name, userGroupId } },
			column: { id },
		}) => {
			const initialValue = getValue();
			// eslint-disable-next-line react-hooks/rules-of-hooks
			const { callModal } = useModalStore((state) => state);
			const { data: usergroups } = api.admin.getUserGroups.useQuery();

			// We need to keep and update the state of the cell normally
			// eslint-disable-next-line react-hooks/rules-of-hooks
			const [value, setValue] = useState(initialValue);
			const { mutate: changeRole } = api.admin.changeRole.useMutation({
				onSuccess: () => {
					void refetchUsers();
					toast.success(t("users.users.toastMessages.roleChangeSuccess"));
				},
				onError: (error) => {
					if ((error.data as ErrorData)?.zodError) {
						const fieldErrors = (error.data as ErrorData)?.zodError.fieldErrors;
						for (const field in fieldErrors) {
							toast.error(`${fieldErrors[field].join(", ")}`);
						}
					} else if (error.message) {
						toast.error(error.message);
					} else {
						toast.error(t("users.users.toastMessages.errorOccurred"));
					}
					void refetchUsers();
				},
			});
			const dropDownHandler = (e: React.ChangeEvent<HTMLSelectElement>, id: number) => {
				let description = "";

				if (e.target.value === "ADMIN") {
					description = t("users.users.roleDescriptions.admin");
				} else if (e.target.value === "USER") {
					description = t("users.users.roleDescriptions.user");
				}

				callModal({
					title: t("users.users.changeRoleModal.title", { name }),
					description,
					yesAction: () => {
						changeRole({
							id,
							role: e.target.value,
						});
					},
				});
			};

			useEffect(() => {
				setValue(initialValue);
			}, [initialValue]);

			if (id === "role") {
				return (
					<select
						defaultValue={initialValue as string}
						onChange={(e) => dropDownHandler(e, userid)}
						className="select select-sm select-ghost max-w-xs"
					>
						<option>ADMIN</option>
						<option>USER</option>
					</select>
				);
			}
			if (id === "group") {
				if (Array.isArray(usergroups) && usergroups.length === 0) {
					return "None";
				}

				return (
					<select
						defaultValue={userGroupId ?? "none"}
						onChange={(e) => {
							assignUserGroup({
								userid,
								userGroupId: e.target.value,
							});
						}}
						className="select select-sm select-ghost max-w-xs"
					>
						<option value="none">None</option>
						{usergroups.map((group) => {
							return (
								<option key={group.id} value={group.id}>
									{group.name}
								</option>
							);
						})}
					</select>
				);
			}
			return value;
		},
	};

	useEffect(() => {
		setData(members ?? []);
	}, [members]);

	const [data, setData] = useState<ExtendedUser[]>(members ?? []);

	const [autoResetPageIndex, skipAutoResetPageIndex] = useSkipper();
	const table = useReactTable({
		data,
		columns,
		defaultColumn,
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
