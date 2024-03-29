import { useEffect, useMemo, useState } from "react";
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
import { useModalStore } from "~/utils/store";
import { useTranslations } from "next-intl";
import { type User } from "@prisma/client";
import TimeAgo from "react-timeago";
import { NetworkEntity } from "~/types/local/network";
import { getLocalStorageItem, setLocalStorageItem } from "~/utils/localstorage";
import {
	useTrpcApiErrorHandler,
	useTrpcApiSuccessHandler,
} from "~/hooks/useTrpcApiHandler";

interface UnlinkedNetworkTableProps {
	network: NetworkEntity;
	members: User[];
	role: string;
}

const LOCAL_STORAGE_KEY = "unlinkedTableSorting";

export const UnlinkedNetwork = () => {
	const t = useTranslations("admin");

	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();

	// Load initial state from localStorage or set to default
	const initialSortingState = getLocalStorageItem(LOCAL_STORAGE_KEY, [
		{ id: "creationTime", desc: true },
	]);
	const [sorting, setSorting] = useState<SortingState>(initialSortingState);

	const {
		data: unlinkedNetworks,
		refetch: refetchNetworks,
		isLoading: loadingNetworks,
	} = api.admin.unlinkedNetwork.useQuery();

	const { mutate: assignNetworkToUser } = api.admin.assignNetworkToUser.useMutation({
		onSuccess: handleApiSuccess({ refetch: [refetchNetworks] }),
		onError: handleApiError,
	});

	// Save to localStorage whenever sorting changes
	useEffect(() => {
		setLocalStorageItem(LOCAL_STORAGE_KEY, sorting);
	}, [sorting]);

	const columnHelper = createColumnHelper<UnlinkedNetworkTableProps & { role: string }>();
	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	const columns = useMemo<ColumnDef<UnlinkedNetworkTableProps>[]>(
		() => [
			columnHelper.accessor("network.nwid", {
				header: () => (
					<span>
						{t("controller.networkMembers.unlinkedNetworks.table.nwid").toUpperCase()}
					</span>
				),
				id: "nwid",
			}),
			columnHelper.accessor("network.name", {
				header: () => (
					<span>
						{t(
							"controller.networkMembers.unlinkedNetworks.table.networkName",
						).toUpperCase()}
					</span>
				),
				id: "name",
			}),
			columnHelper.accessor("network.creationTime", {
				header: () => (
					<span>
						{t(
							"controller.networkMembers.unlinkedNetworks.table.creationTime",
						).toUpperCase()}
					</span>
				),
				id: "creationTime",
				cell: ({ getValue }) => {
					const creationTime = getValue();
					return <TimeAgo date={creationTime} />;
				},
			}),
			columnHelper.accessor("members", {
				header: () => (
					<span>
						{t("controller.networkMembers.unlinkedNetworks.table.members").toUpperCase()}
					</span>
				),
				id: "members",
				cell: ({ getValue }) => {
					const members = getValue();

					return members.length;
				},
			}),
			columnHelper.accessor("role", {
				header: () => (
					<span>
						{t("controller.networkMembers.unlinkedNetworks.table.assign").toUpperCase()}
					</span>
				),
				id: "role",
			}),
		],
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	// Create an editable cell renderer
	const defaultColumn: Partial<ColumnDef<UnlinkedNetworkTableProps>> = {
		cell: ({
			getValue,
			row: { original: { network: { nwid, name } } },
			column: { id },
		}) => {
			const { data: adminUsers } = api.admin.getUsers.useQuery({
				isAdmin: true,
			});
			const initialValue = getValue();
			// eslint-disable-next-line react-hooks/rules-of-hooks
			const { callModal } = useModalStore((state) => state);

			const dropDownHandler = (e: React.ChangeEvent<HTMLSelectElement>, nwid: string) => {
				const userId = e.target.value;
				const userName = e.target.options[e.target.selectedIndex].dataset.username;

				callModal({
					title: t("controller.networkMembers.unlinkedNetworks.assignModal.title", {
						user: userName,
						network: nwid,
					}),
					description: t(
						"controller.networkMembers.unlinkedNetworks.assignModal.description",
					),
					yesAction: () => {
						assignNetworkToUser({
							nwid,
							userId,
							nwname: name,
						});
					},
				});
			};

			if (id === "role") {
				return (
					<select
						onChange={(e) => dropDownHandler(e, nwid)}
						className="select select-sm select-ghost w-full max-w-xs"
						defaultValue="defaultOption"
					>
						<option disabled value="defaultOption">
							Assign User
						</option>
						{adminUsers?.map((user) => (
							<option key={user.id} value={user.id} data-username={user.name}>
								{user.name}
							</option>
						))}
					</select>
				);
			}
			return initialValue;
		},
	};

	const data = useMemo(() => unlinkedNetworks || [], [unlinkedNetworks]);
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

	if (loadingNetworks) {
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
										<tr key={row.original?.network?.nwid} className={"items-center"}>
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
				</div>
			</div>
		</div>
	);
};
