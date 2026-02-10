import { useRouter } from "next/router";
import { useMemo, useState, useEffect, useRef } from "react";
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
import { NetworkTableMemberCount } from "./networkTableMemberCount";

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
export const NetworkTable = ({ tableData = [], onCreateNetwork }) => {
	const router = useRouter();
	const t = useTranslations();
	const b = useTranslations("commonButtons");
	const searchInputRef = useRef<HTMLInputElement>(null);

	const callModal = useModalStore((state) => state.callModal);

	// Load initial state from localStorage or set to default
	const initialSortingState = getLocalStorageItem(LOCAL_STORAGE_KEY, [
		{ id: "nwid", desc: true },
	]);
	const [globalFilter, setGlobalFilter] = useState("");
	const [sorting, setSorting] = useState<SortingState>(initialSortingState);

	// Auto-focus search input when component mounts
	useEffect(() => {
		if (searchInputRef.current) {
			searchInputRef.current.focus();
		}
	}, []);

	type ColumnsType = {
		name: string;
		description: string;
		nwid: string;
		members: network_members[];
		networkMembers: network_members[];
		action: string;
		memberCounts: {
			display: string;
		};
	};
	const columnHelper = createColumnHelper<ColumnsType>();
	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	const columns = useMemo(
		() => [
			columnHelper.accessor("name", {
				cell: (info) => info.getValue(),
				header: () => <span>{t("commonTable.header.name")}</span>,
			}),
			columnHelper.accessor("description", {
				size: 300,
				cell: (info) => <TruncateText text={info.getValue()} />,
				header: () => <span>{t("commonTable.header.description")}</span>,
			}),
			columnHelper.accessor("nwid", {
				// cell: (info) => info.getValue(),
				header: () => <span>{t("commonTable.header.networkId")}</span>,
				// footer: (info) => info.column.id,
				cell: ({ row: { original } }) => {
					return (
						<div onClick={(e) => e.stopPropagation()}>
							<CopyToClipboard
								text={original.nwid}
								onCopy={() => {
									toast.success(
										t("commonToast.copyToClipboard.success", { element: original.nwid }),
									);
								}}
								title={t("commonToast.copyToClipboard.title")}
							>
								<div className="cursor-pointer flex items-center gap-1">
									<span>{original.nwid}</span>
									<CopyIcon />
								</div>
							</CopyToClipboard>
						</div>
					);
				},
			}),
			columnHelper.accessor("members", {
				header: () => <span>{t("commonTable.header.memberActTot")}</span>,
				cell: ({ row: { original } }) => {
					if (!Array.isArray(original.networkMembers)) {
						return <NetworkTableMemberCount count="0" />;
					}
					return <NetworkTableMemberCount count={original.memberCounts.display} />;
				},
			}),
			columnHelper.accessor("action", {
				header: () => <span>{t("commonTable.header.actions")}</span>,
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
													{t.rich("networks.networkActionModal.modalTitle", {
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
								{t("commonTable.cell.Options")}
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

	const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Enter") {
			// Get the first row from filtered results
			const firstRow = table.getRowModel().rows[0];
			if (firstRow) {
				const nwid = firstRow.original.nwid;
				handleRowClick(nwid);
			}
		}
	};

	return (
		<div className="w-full space-y-4">
			{/* Search and Create Button Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
				<div className="flex-1 max-w-sm">
					<DebouncedInput
						ref={searchInputRef}
						value={globalFilter ?? ""}
						onChange={(value) => setGlobalFilter(String(value))}
						onKeyDown={handleSearchKeyDown}
						className="input input-bordered input-sm w-full shadow-sm focus:shadow-md transition-shadow"
						placeholder={t("commonTable.search.networkSearchPlaceholder")}
					/>
				</div>
				{onCreateNetwork && (
					<div className="flex-shrink-0">
						<button
							className="btn btn-primary btn-sm gap-2 shadow-md hover:shadow-lg transition-all"
							onClick={onCreateNetwork}
							title={b("addNetwork")}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								strokeWidth="1.5"
								stroke="currentColor"
								className="h-4 w-4"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M12 4.5v15m7.5-7.5h-15"
								/>
							</svg>
							<span>{b("addNetwork")}</span>
						</button>
					</div>
				)}
			</div>

			{/* Elegant Table */}
			<div className="rounded-xl shadow-sm border border-base-300/50 overflow-hidden bg-base-100/50 backdrop-blur-sm">
				<div className="overflow-x-auto">
					<table className="table w-full">
						<thead className="bg-base-200/80">
							{table.getHeaderGroups().map((headerGroup) => (
								<tr key={headerGroup.id}>
									{headerGroup.headers.map((header) => {
										return (
											<th
												key={header.id}
												colSpan={header.colSpan}
												className="text-base-content font-semibold text-sm tracking-wide py-4 px-6 border-b border-base-300/30"
												style={{
													width: header.getSize() !== 150 ? header.getSize() : undefined,
												}}
											>
												{header.isPlaceholder ? null : (
													<div
														{...{
															className: header.column.getCanSort()
																? "cursor-pointer select-none flex items-center gap-2 hover:text-primary transition-colors"
																: "flex items-center gap-2",
															onClick: header.column.getToggleSortingHandler(),
														}}
													>
														{flexRender(
															header.column.columnDef.header,
															header.getContext(),
														)}
														{header.column.getCanSort() && (
															<span className="text-xs opacity-60">
																{{
																	asc: "↑",
																	desc: "↓",
																}[header.column.getIsSorted() as string] ?? "↕"}
															</span>
														)}
													</div>
												)}
											</th>
										);
									})}
								</tr>
							))}
						</thead>
						<tbody>
							{table.getRowModel().rows.map((row, index) => {
								const isLastRow = index === table.getRowModel().rows.length - 1;
								const isEvenRow = index % 2 === 0;
								return (
									<tr
										key={row.id}
										// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
										onClick={() => handleRowClick(row?.original?.nwid as string)}
										className={`cursor-pointer hover:bg-primary/10 transition-all duration-200 ${
											isEvenRow ? "bg-base-50/30" : "bg-transparent"
										} ${!isLastRow ? "border-b border-base-300/20" : ""}`}
									>
										{row.getVisibleCells().map((cell) => {
											return (
												<td key={cell.id} className="py-4 px-6 text-sm">
													{flexRender(cell.column.columnDef.cell, cell.getContext())}
												</td>
											);
										})}
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>

				{/* Footer */}
				<div className="bg-base-200/80 border-t border-base-300/30 px-6 py-4">
					<TableFooter table={table} page="networkTable" />
				</div>
			</div>
		</div>
	);
};
