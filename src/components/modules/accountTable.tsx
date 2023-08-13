import { useMemo, useState, useEffect } from "react";
import {
	useReactTable,
	getCoreRowModel,
	// getPaginationRowModel,
	getSortedRowModel,
	flexRender,
	createColumnHelper,
	type ColumnDef,
	type SortingState,
} from "@tanstack/react-table";
import { api } from "~/utils/api";
import { type ErrorData } from "~/types/errorHandling";
import toast from "react-hot-toast";
import { useModalStore } from "~/utils/store";
import { useTranslations } from "next-intl";
import { type User } from "@prisma/client";

export const Accounts = () => {
	const t = useTranslations("admin");

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
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-call
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
	type ExtendedUser = {
		_count: {
			network: number;
		};
	} & User;
	const columnHelper = createColumnHelper<User>();
	const columns = useMemo<ColumnDef<User>[]>(
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
		],
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	// Create an editable cell renderer
	const defaultColumn: Partial<ColumnDef<User>> = {
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
							// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-call
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
			const dropDownHandler = (
				e: React.ChangeEvent<HTMLSelectElement>,
				id: number,
			) => {
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

			// eslint-disable-next-line react-hooks/rules-of-hooks
			useEffect(() => {
				setValue(initialValue);
			}, [initialValue]);

			// if (id === "name") {
			// 	return (
			// 		<input
			// 			className="m-0 border-0 bg-transparent p-0"
			// 			value={value as string}
			// 			onChange={onChange}
			// 			onBlur={onBlur}
			// 		/>
			// 	);
			// }
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

	const data = useMemo(() => members || [], [members]);
	const table = useReactTable({
		data,
		//@ts-expect-error
		columns,
		//@ts-expect-error
		defaultColumn,
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		// getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(), //order doesn't matter anymore!
		state: {
			sorting,
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
			<div className="inline-block py-5 text-center ">
				<div className="overflow-hidden rounded-lg border w-full">
					<table
						// {...{
						// 	style: {
						// 		width: table.getCenterTotalSize(),
						// 	},
						// }}
						className="overflow-x-auto table-wrapper divide-y divide-gray-400"
					>
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
																		onClick:
																			header.column.getToggleSortingHandler(),
																	}}
																>
																	{flexRender(
																		header.column.columnDef.header,
																		header.getContext(),
																	)}
																	{{
																		asc: " 🔼",
																		desc: " 🔽",
																	}[header.column.getIsSorted() as string] ??
																		null}
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
																flexRender(
																	cell.column.columnDef.cell,
																	cell.getContext(),
																)
															}
														</td>
													))
											}
										</tr>
									))
							}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
};
