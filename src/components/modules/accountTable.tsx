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
	const columnHelper = createColumnHelper<User>();
	const columns = useMemo<ColumnDef<User>[]>(
		() => [
			columnHelper.accessor("id", {
				header: () => <span>{t("users.table.id")}</span>,
				id: "id",
			}),
			columnHelper.accessor("name", {
				header: () => <span>{t("users.table.memberName")}</span>,
				id: "name",
			}),
			columnHelper.accessor("email", {
				header: () => <span>{t("users.table.email")}</span>,
				id: "email",
			}),
			columnHelper.accessor("emailVerified", {
				header: () => <span>{t("users.table.emailVerified")}</span>,
				id: "emailVerified",
				cell: ({ getValue }) => {
					if (getValue()) {
						return t("users.table.emailVerifiedYes");
					}

					return t("users.table.emailVerifiedNo");
				},
			}),
			// columnHelper.accessor("online", {
			//   header: () => <span>Online</span>,
			//   id: "online",
			//   cell: ({ getValue }) => {
			//     if (getValue()) {
			//       return "Yes";
			//     }

			//     return "No";
			//   },
			// }),
			columnHelper.accessor("role", {
				header: () => <span>{t("users.table.role")}</span>,
				id: "role",
			}),
		],
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	// Create an editable cell renderer
	const defaultColumn: Partial<ColumnDef<User>> = {
		cell: ({
			getValue,
			row: { index, original: { id: userid, name } },
			column: { id },
		}) => {
			const initialValue = getValue();
			// eslint-disable-next-line react-hooks/rules-of-hooks
			const { callModal } = useModalStore((state) => state);

			// We need to keep and update the state of the cell normally
			// eslint-disable-next-line react-hooks/rules-of-hooks
			const [value, setValue] = useState(initialValue);
			const { mutate: changeRole } = api.admin.changeRole.useMutation({
				onSuccess: () => {
					void refetchUsers();
					toast.success(t("users.toastMessages.roleChangeSuccess"));
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
						toast.error(t("users.toastMessages.errorOccurred"));
					}
					void refetchUsers();
				},
			});
			const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
				setValue(e.target.value);
			};
			const onBlur = () => {
				table.options.meta?.updateData(index, id, value);
			};
			const dropDownHandler = (
				e: React.ChangeEvent<HTMLSelectElement>,
				id: number,
			) => {
				let description = "";

				if (e.target.value === "ADMIN") {
					description = t("users.roleDescriptions.admin");
				} else if (e.target.value === "USER") {
					description = t("users.roleDescriptions.user");
				}

				callModal({
					title: t("users.changeRoleModal.title", { name }),
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

			if (id === "name") {
				return (
					<input
						className="m-0 border-0 bg-transparent p-0"
						value={value as string}
						onChange={onChange}
						onBlur={onBlur}
					/>
				);
			}
			if (id === "role") {
				return (
					<select
						defaultValue={initialValue as string}
						onChange={(e) => dropDownHandler(e, userid)}
						className="select select-ghost max-w-xs"
					>
						<option>ADMIN</option>
						<option>USER</option>
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
		<div className="overflow-x-auto">
			<div className="inline-block w-full p-1.5 text-center align-middle">
				<div className="overflow-hidden rounded-lg border">
					<table className="table-wrapper min-w-full divide-y divide-gray-400">
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
													<th
														key={header.id}
														colSpan={header.colSpan}
														scope="col"
														className="bg-base-300/50 py-3 pl-4"
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
												))
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

														<td key={cell.id} className="py-1 pl-4">
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
