import { useRouter } from "next/router";
import { useMemo, useState, useEffect } from "react";
import { DebouncedInput } from "~/components/elements/debouncedInput";
import {
	useReactTable,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	flexRender,
	createColumnHelper,
	type SortingState,
} from "@tanstack/react-table";
import { useSkipper } from "../../hooks/useSkipper";
import { useTranslations } from "next-intl";
import { type network_members } from "@prisma/client";
import { getLocalStorageItem, setLocalStorageItem } from "~/utils/localstorage";
import TableFooter from "../shared/tableFooter";
import { useModalStore } from "~/utils/store";
import NetworkOptionsModal from "./networkOptionsModal";
import { CopyToClipboard } from "react-copy-to-clipboard";
import toast from "react-hot-toast";
import CopyIcon from "~/icons/copy";

const LOCAL_STORAGE_KEY = "networkTableSorting";

// import { makeNetworkData } from "../../utils/fakeData";
const TruncateText = ({ text }: { text: string }) => {
	if (!text) return null;

	const shouldTruncate = text?.length > 100;
	return (
		<div
			className={`text-left ${
				shouldTruncate
					? "max-w-[150px] truncate sm:max-w-xs md:overflow-auto md:whitespace-normal"
					: ""
			}`}
		>
			{text}
		</div>
	);
};
export const NetworkTable = ({ tableData = [] }) => {
	const router = useRouter();
	const t = useTranslations("networks");
	const n = useTranslations("networkById");
	const ct = useTranslations("commonTable");

	const { callModal } = useModalStore((state) => state);

	// Load initial state from localStorage or set to default
	const initialSortingState = getLocalStorageItem(LOCAL_STORAGE_KEY, [
		{ id: "nwid", desc: true },
	]);
	const [globalFilter, setGlobalFilter] = useState("");
	const [sorting, setSorting] = useState<SortingState>(initialSortingState);

	type ColumnsType = {
		name: string;
		description: string;
		nwid: string;
		members: network_members[];
		networkMembers: network_members[];
		action: string;
	};
	const columnHelper = createColumnHelper<ColumnsType>();
	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	const columns = useMemo(
		() => [
			columnHelper.accessor("name", {
				cell: (info) => info.getValue(),
				header: () => <span>{ct("header.name")}</span>,
			}),
			columnHelper.accessor("description", {
				size: 300,
				cell: (info) => <TruncateText text={info.getValue()} />,
				header: () => <span>{ct("header.description")}</span>,
			}),
			columnHelper.accessor("nwid", {
				// cell: (info) => info.getValue(),
				header: () => <span>{ct("header.networkId")}</span>,
				// footer: (info) => info.column.id,
				cell: ({ row: { original } }) => {
					return (
						<div onClick={(e) => e.stopPropagation()}>
							<CopyToClipboard
								text={original.nwid}
								onCopy={() => {
									toast.success(n("copyToClipboard.success", { element: original.nwid }));
								}}
								title={n("copyToClipboard.title")}
							>
								<div className="cursor-pointer flex items-center justify-center">
									{original.nwid}
									<CopyIcon />
								</div>
							</CopyToClipboard>
						</div>
					);
				},
			}),
			columnHelper.accessor("members", {
				header: () => <span>{ct("header.members")}</span>,
				cell: ({ row: { original } }) => {
					if (!Array.isArray(original.networkMembers)) return <span>0</span>;
					return <span>{original.networkMembers.length}</span>;
				},
			}),
			columnHelper.accessor("action", {
				header: () => <span>{ct("header.actions")}</span>,
				id: "action",
				cell: ({ row: { original } }) => {
					return (
						<div className="space-x-2">
							<button
								onClick={(event) => {
									event.stopPropagation(); // This will prevent the event from propagating to the row
									callModal({
										title: (
											<p>
												<span>
													{t.rich("networkActionModal.modalTitle", {
														span: (children) => (
															<span className="text-primary">{children}</span>
														),
														networkName: original.nwid,
													})}
												</span>
											</p>
										),
										rootStyle: "text-left",
										content: <NetworkOptionsModal networkId={original.nwid} />,
									});
								}}
								className="btn btn-outline btn-xs rounded-sm"
							>
								{ct("cell.Options")}
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
		setData(tableData);
	}, [tableData]);

	const [data, setData] = useState(tableData);
	const [autoResetPageIndex, skipAutoResetPageIndex] = useSkipper();
	const table = useReactTable({
		columns,
		data,
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		autoResetPageIndex,
		meta: {
			updateData: (rowIndex, columnId, value) => {
				// Skip page index reset until after next rerender
				skipAutoResetPageIndex();
				setData((old: ColumnsType[]) =>
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
		state: {
			sorting,
			globalFilter,
		},
		onGlobalFilterChange: setGlobalFilter,
		getFilteredRowModel: getFilteredRowModel(),
		debugTable: false,
	});
	const handleRowClick = (nwid: string) => {
		void router.push(`/network/${nwid}`);
	};

	return (
		<div className="inline-block w-full p-1.5 align-middle">
			<div>
				<DebouncedInput
					value={globalFilter ?? ""}
					onChange={(value) => setGlobalFilter(String(value))}
					className="font-lg border-block border p-2 shadow"
					placeholder={ct("search.networkSearchPlaceholder")}
				/>
			</div>
			<div className="overflow-auto rounded-lg border border-base-200/50">
				<table className="min-w-full divide-y text-center">
					<thead className="">
						{table.getHeaderGroups().map((headerGroup) => (
							<tr key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									return (
										<th
											key={header.id}
											colSpan={header.colSpan}
											className="bg-base-300/50 p-2 "
											style={{
												width: header.getSize() !== 150 ? header.getSize() : undefined,
											}}
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
								})}
							</tr>
						))}
					</thead>
					<tbody className="divide-y">
						{table.getRowModel().rows.map((row) => {
							return (
								<tr
									key={row.id}
									// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
									onClick={() => handleRowClick(row?.original?.nwid as string)}
									className="cursor-pointer border-base-300/50 hover:bg-primary/5"
								>
									{row.getVisibleCells().map((cell) => {
										return (
											<td key={cell.id} className="p-2">
												{flexRender(cell.column.columnDef.cell, cell.getContext())}
											</td>
										);
									})}
								</tr>
							);
						})}
					</tbody>
				</table>
				<div className="flex flex-col items-center justify-between py-3 sm:flex-row">
					<TableFooter table={table} page="networkTable" />
				</div>
			</div>
		</div>
	);
};
