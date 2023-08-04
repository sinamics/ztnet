import { useMemo, useEffect, useState, useRef } from "react";
import TimeAgo from "react-timeago";
import { CopyToClipboard } from "react-copy-to-clipboard";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
  type RowData,
  type SortingState,
} from "@tanstack/react-table";
import { api } from "~/utils/api";
import { toast } from "react-hot-toast";
import { useRouter } from "next/router";
import { isIPInSubnet } from "~/utils/isIpInsubnet";
import { useModalStore } from "~/utils/store";
import { MemberOptionsModal } from "./memberOptionsModal";
import {
  type NetworkMemberNotation,
  type MembersEntity,
} from "~/types/network";
import { DebouncedInput } from "../elements/debouncedInput";
import { useSkipper } from "../elements/useSkipper";
import TableFooter from "./tableFooter";
import { convertRGBtoRGBA } from "~/utils/randomColor";
import Input from "../elements/input";
import { useTranslations } from "next-intl";
// import { makeNetworkMemberData } from "~/utils/fakeData";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends RowData> {
    updateData: (rowIndex: number, columnId: string, value: unknown) => void;
  }
}

interface IProp {
  nwid: string;
  central?: boolean;
}

enum ConnectionStatus {
  Offline = 0,
  Relayed = 1,
  DirectLAN = 2,
  DirectWAN = 3,
}
export const NetworkMembersTable = ({ nwid, central = false }: IProp) => {
  const t = useTranslations("networkById");
  const { query } = useRouter();
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([
    {
      id: "id",
      desc: true,
    },
  ]);
  const { callModal } = useModalStore((state) => state);

  const {
    data: networkById,
    refetch: refetchNetworkById,
    isLoading: loadingNetworks,
  } = api.network.getNetworkById.useQuery(
    {
      nwid,
      central,
    },
    { enabled: !!query.id }
  );

  const { data: options } = api.admin.getAllOptions.useQuery();
  const { mutate: updateMemberDatabaseOnly } =
    api.networkMember.UpdateDatabaseOnly.useMutation();
  const { mutate: updateMember } = api.networkMember.Update.useMutation({
    onError: (e) => {
      void toast.error(e?.message);
    },
    onSuccess: () => refetchNetworkById(),
  });
  const { mutate: stashUser } = api.networkMember.stash.useMutation({
    onSuccess: () => refetchNetworkById(),
  });

  const deleteIpAssignment = (
    ipAssignments: Array<string>,
    Ipv4: string,
    id: string
  ) => {
    const _ipv4 = [...ipAssignments];
    const newIpPool = _ipv4.filter((r) => r !== Ipv4);

    updateMember(
      {
        updateParams: { ipAssignments: [...newIpPool] },
        memberId: id,
        nwid,
      },
      {
        onSuccess: () => {
          void refetchNetworkById();
        },
      }
    );
  };
  const stashMember = (id: string) => {
    stashUser(
      {
        nwid,
        id,
      },
      { onSuccess: () => void refetchNetworkById() }
    );
  };
  const columnHelper = createColumnHelper<MembersEntity>();
  const columns = useMemo<ColumnDef<MembersEntity>[]>(
    () => [
      columnHelper.accessor(
        (row) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
          const notations = (row as any)?.notations as NetworkMemberNotation[];
          const output: string[] = [];
          notations?.map((tag) => {
            return output.push(tag?.label?.name);
          });

          return output.join(", ");
        },
        {
          header: () => "Notations",
          id: "notations",
        }
      ),
      columnHelper.accessor("authorized", {
        header: () => <span>{t("networkMembersTable.column.authorized")}</span>,
        id: "authorized",
        cell: ({ getValue, row: { original } }) => {
          return (
            <label className="label cursor-pointer justify-center">
              <input
                type="checkbox"
                checked={getValue()}
                onChange={(event) =>
                  updateMember(
                    {
                      nwid,
                      memberId: original.id,
                      updateParams: { authorized: event.target.checked },
                    },
                    { onSuccess: () => void refetchNetworkById() }
                  )
                }
                // className="checkbox-error checkbox"
                className="checkbox-success checkbox checkbox-xs sm:checkbox-sm"
              />
            </label>
          );
        },
      }),
      columnHelper.accessor("name", {
        header: () => <span>{t("networkMembersTable.column.name")}</span>,
        id: "name",
      }),
      columnHelper.accessor("id", {
        header: () => <span>{t("networkMembersTable.column.id")}</span>,
        id: "id",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("ipAssignments", {
        header: () => (
          <span>{t("networkMembersTable.column.ipAssignments.header")}</span>
        ),
        id: "ipAssignments",
      }),
      columnHelper.accessor("creationTime", {
        header: () => <span>{t("networkMembersTable.column.created")}</span>,
        id: "creationTime",
        cell: (info) => <TimeAgo date={info.getValue() as number} />,
      }),
      columnHelper.accessor("peers", {
        header: () => (
          <span>{t("networkMembersTable.column.physicalIp.header")}</span>
        ),
        id: "physicalAddress",
        cell: (info) => {
          const val = info.getValue();
          if (!val || typeof val.physicalAddress !== "string")
            return (
              <span className="text-gray-400/50">
                {t("networkMembersTable.column.physicalIp.unknownValue")}
              </span>
            );

          return val.physicalAddress.split("/")[0];
        },
      }),
      columnHelper.accessor("conStatus", {
        header: () => (
          <span>{t("networkMembersTable.column.conStatus.header")}</span>
        ),
        id: "conStatus",
        cell: ({ row: { original } }) => {
          const formatTime = (value: string, unit: string) =>
            `${value} ${unit}`;
          const cursorStyle = { cursor: "pointer" };

          if (original.conStatus === ConnectionStatus.Relayed) {
            return (
              <span
                style={cursorStyle}
                className="cursor-pointer text-warning"
                title={t("networkMembersTable.column.conStatus.toolTip")}
              >
                {t("networkMembersTable.column.conStatus.relayed")}
              </span>
            );
          }

          if (
            original.conStatus === ConnectionStatus.DirectLAN ||
            original.conStatus === ConnectionStatus.DirectWAN
          ) {
            const directTitle =
              original.conStatus === ConnectionStatus.DirectLAN
                ? t("networkMembersTable.column.conStatus.directLan")
                : t("networkMembersTable.column.conStatus.directWan");
            const versionInfo =
              original.peers && original.peers?.version !== "-1.-1.-1"
                ? ` (v${original.peers?.version})`
                : "";

            return (
              <span
                style={cursorStyle}
                className="text-success"
                title={directTitle}
              >
                {t("networkMembersTable.column.conStatus.direct", {
                  version: versionInfo,
                })}
              </span>
            );
          }

          return (
            <span
              style={cursorStyle}
              className="text-error"
              title="User is offline"
            >
              {t("networkMembersTable.column.conStatus.offline")}
              <TimeAgo
                date={original?.lastSeen as number}
                formatter={formatTime}
              />
            </span>
          );
        },
      }),
      columnHelper.accessor("action", {
        header: () => (
          <span>{t("networkMembersTable.column.actions.header")}</span>
        ),
        id: "action",
        cell: ({ row: { original } }) => {
          return (
            <div className="space-x-2">
              <button
                onClick={() =>
                  callModal({
                    title: (
                      <p>
                        {t("networkMembersTable.optionModalTitle")}{" "}
                        <span className="text-primary">{`${
                          original.name ? original.name : original.id
                        }`}</span>
                      </p>
                    ),
                    rootStyle: "text-left",
                    content: (
                      <MemberOptionsModal
                        nwid={original.nwid}
                        memberId={original.id}
                      />
                    ),
                  })
                }
                className="btn btn-outline btn-xs rounded-sm"
              >
                {t("networkMembersTable.column.actions.optionBtn")}
              </button>
              <button
                onClick={() => stashMember(original.id)}
                className="btn btn-warning btn-outline btn-xs rounded-sm"
              >
                {t("networkMembersTable.column.actions.stashBtn")}
              </button>
            </div>
          );
        },
      }),
    ],
    // this is needed so the ip in table is updated accordingly
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [networkById?.network]
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const defaultColumn: Partial<ColumnDef<MembersEntity>> = {
    cell: ({ getValue, row: { index, original }, column: { id }, table }) => {
      const initialValue = getValue();
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const inputRef = useRef<HTMLInputElement>(null);

      // We need to keep and update the state of the cell normally
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const [value, setValue] = useState(initialValue);

      // When the input is blurred, we'll call our table meta's updateData function
      const onBlur = () => {
        table.options.meta?.updateData(index, id, value);
      };

      const submitName = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        updateMemberDatabaseOnly(
          {
            nwid,
            id: original.id,
            updateParams: {
              name: value as string,
            },
          },
          {
            onSuccess: () => {
              void refetchNetworkById();
              toast.success(
                t("networkMembersTable.toastMessages.memberNameUpdated")
              );
            },
          }
        );

        inputRef.current?.blur();
        // updateMyData(index, id, value, original);
      };
      // If the initialValue is changed external, sync it up with our state
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useEffect(() => {
        setValue(initialValue);
      }, [initialValue]);

      if (id === "name") {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
        const notations = (original as any)
          ?.notations as NetworkMemberNotation[];
        return (
          <form>
            <span className="flex items-center space-x-2">
              {options?.showNotationMarkerInTableRow &&
                notations.map((notation, idx) => (
                  <div
                    key={idx}
                    className="inline-block h-5 w-5 rounded-full"
                    title={notation.label?.name}
                    style={{
                      backgroundColor: convertRGBtoRGBA(
                        notation.label?.color,
                        1
                      ),
                    }}
                  ></div>
                ))}
              <Input
                ref={inputRef}
                placeholder={t("networkMembersTable.tableRow.updateName")}
                name="networkName"
                onChange={(e) => setValue(e.target.value)}
                onBlur={onBlur}
                value={(value as string) || ""}
                type="text"
                className="input-primary input-sm m-0 border-0 bg-transparent p-0"
              />
            </span>
            <button type="submit" onClick={submitName} className="hidden" />
          </form>
        );
      }
      if (id === "ipAssignments") {
        if (!original.ipAssignments || !original.ipAssignments.length)
          return (
            <p className="text-gray-500">
              {t("networkMembersTable.column.ipAssignments.notAssigned")}
            </p>
          );

        return (
          <div className="space-y-1">
            {original?.ipAssignments.map((assignedIp) => {
              const subnetMatch = isIPInSubnet(
                assignedIp,
                networkById.network?.routes
              );
              return (
                <div
                  key={assignedIp}
                  className="flex justify-center text-center"
                >
                  <div
                    className={`${
                      subnetMatch
                        ? "badge badge-primary badge-lg rounded-md"
                        : "badge badge-ghost badge-lg rounded-md opacity-60"
                    } flex min-w-fit justify-between gap-1`}
                  >
                    <CopyToClipboard
                      text={assignedIp}
                      onCopy={() =>
                        toast.success(
                          t("copyToClipboard.success", { element: assignedIp })
                        )
                      }
                      title={t("copyToClipboard.title")}
                    >
                      <div className="cursor-pointer">{assignedIp}</div>
                    </CopyToClipboard>
                    <div className="text-xs">
                      {original?.peers?.latency > 0 &&
                        ` (${original?.peers.latency}ms)`}
                    </div>
                    {original?.ipAssignments.length > 0 && (
                      <div title="delete ip assignment">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.5"
                          stroke="currentColor"
                          className="z-10 ml-4 h-4 w-4 cursor-pointer text-warning"
                          onClick={() =>
                            deleteIpAssignment(
                              original?.ipAssignments,
                              assignedIp,
                              original?.id
                            )
                          }
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      }
      return getValue();
    },
  };

  useEffect(() => {
    setData(networkById?.members ?? []);
  }, [networkById?.members]);

  // makeNetworkMemberData
  const [data, setData] = useState(networkById?.members ?? []);

  // const [data, setData] = useState(() => makeNetworkMemberData(100));
  const [autoResetPageIndex, skipAutoResetPageIndex] = useSkipper();
  const table = useReactTable({
    data,
    columns,
    defaultColumn,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex,
    initialState: {
      columnVisibility: {
        notations: false,
      },
    },
    meta: {
      updateData: (rowIndex, columnId, value) => {
        // Skip page index reset until after next rerender
        skipAutoResetPageIndex();
        setData((old) =>
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          old.map((row, index) => {
            if (index === rowIndex) {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return
              return {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                ...old[rowIndex]!,
                [columnId]: value,
              };
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return row;
          })
        );
      },
    },
    state: {
      // columnVisibility: { notations: false },
      sorting,
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getFilteredRowModel: getFilteredRowModel(),
    debugTable: false,
  });

  if (loadingNetworks) return <div>Loading</div>;
  return (
    <span className="rounded-xl pt-2">
      <div className="py-1">
        <DebouncedInput
          value={globalFilter ?? ""}
          onChange={(value) => setGlobalFilter(String(value))}
          className="font-lg border-block border p-2 shadow"
          placeholder={t("networkMembersTable.search.placeholder")}
        />
      </div>
      <table className="w-full divide-y divide-gray-400 overflow-x-auto border border-gray-500 text-center">
        <thead className="bg-base-100 ">
          {
            // Loop over the header rows
            table.getHeaderGroups().map((headerGroup) => (
              // Apply the header row props
              <tr key={headerGroup.id}>
                {
                  // Loop over the headers in each row
                  headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      colSpan={header.colSpan}
                      className="bg-base-300/50 p-2"
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
                            header.getContext()
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
        <tbody className=" divide-y divide-gray-500">
          {
            // Loop over the table rows
            table.getRowModel().rows.map((row) => {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              const notation = row.original
                ?.notations as NetworkMemberNotation[];
              return (
                <tr
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
                  key={row.original.id}
                  className={`items-center ${
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
                    !row.original.authorized
                      ? "border-dotted bg-error bg-opacity-20"
                      : ""
                  }`}
                  style={
                    options?.useNotationColorAsBg && notation.length > 0
                      ? {
                          backgroundColor: convertRGBtoRGBA(
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
                            (notation[0] as any)?.label?.color as string,
                            0.3
                          ),
                        }
                      : {}
                  }
                >
                  {
                    // Loop over the rows cells
                    row.getVisibleCells().map((cell) => (
                      // Apply the cell props

                      <td key={cell.id} className="py-1 pl-4">
                        {
                          // Render the cell contents
                          flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )
                        }
                      </td>
                    ))
                  }
                </tr>
              );
            })
          }
        </tbody>
      </table>
      <div className="flex flex-col items-center justify-between py-3 sm:flex-row">
        <TableFooter table={table} />
      </div>
    </span>
  );
};
