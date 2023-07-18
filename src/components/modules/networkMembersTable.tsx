import React, { useMemo, useEffect, useState } from "react";
import TimeAgo from "react-timeago";
import { CopyToClipboard } from "react-copy-to-clipboard";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
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
import { type MembersEntity } from "~/types/network";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends RowData> {
    updateData: (rowIndex: number, columnId: string, value: unknown) => void;
  }
}

enum ConnectionStatus {
  Offline = 0,
  Relayed = 1,
  DirectLAN = 2,
  DirectWAN = 3,
}
export const NetworkMembersTable = ({ nwid }: { nwid: string }) => {
  const { query } = useRouter();
  const [sorting, setSorting] = React.useState<SortingState>([
    {
      id: "id",
      desc: true,
    },
  ]);
  const { callModal } = useModalStore((state) => state);

  const { data: networkById, refetch: refetchNetworkById } =
    api.network.getNetworkById.useQuery(
      {
        nwid,
      },
      { enabled: !!query.id, networkMode: "online" }
    );

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
      { onSuccess: void refetchNetworkById() }
    );
  };
  const columnHelper = createColumnHelper<MembersEntity>();
  const columns = useMemo<ColumnDef<MembersEntity>[]>(
    () => [
      columnHelper.accessor("authorized", {
        header: () => <span>Authorized</span>,
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
        header: () => <span>Member name</span>,
        id: "name",
      }),
      columnHelper.accessor("id", {
        header: () => <span>ID</span>,
        id: "id",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("ipAssignments", {
        header: () => <span>IP / Latency</span>,
        id: "ipAssignments",
      }),
      columnHelper.accessor("creationTime", {
        header: () => <span>Created</span>,
        id: "creationTime",
        cell: (info) => <TimeAgo date={info.getValue() as number} />,
      }),
      columnHelper.accessor("peers.physicalAddress", {
        header: () => <span>Physical Address</span>,
        id: "physicalAddress",
        cell: (info) => {
          const val = info.getValue();
          if (!val || typeof val !== "string")
            return <span className="text-gray-400/50">unknown</span>;

          return val.split("/")[0];
        },
      }),
      columnHelper.accessor("conStatus", {
        header: () => <span>Conn Status</span>,
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
                title="Could not establish direct connection and is currently being Relayed through zerotier servers with higher latency"
              >
                RELAYED
              </span>
            );
          }

          if (
            original.conStatus === ConnectionStatus.DirectLAN ||
            original.conStatus === ConnectionStatus.DirectWAN
          ) {
            const directTitle =
              original.conStatus === ConnectionStatus.DirectLAN
                ? "Direct LAN connection established"
                : "Direct WAN connection established";
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
                DIRECT{versionInfo}
              </span>
            );
          }

          return (
            <span
              style={cursorStyle}
              className="text-error"
              title="User is offline"
            >
              offline{" "}
              <TimeAgo
                date={original?.lastseen as number}
                formatter={formatTime}
              />
            </span>
          );
        },
      }),
      columnHelper.accessor("action", {
        header: () => <span>Action</span>,
        id: "action",
        cell: ({ row: { original } }) => {
          return (
            <div className="space-x-2">
              <button
                onClick={() =>
                  callModal({
                    title: (
                      <p>
                        Options for member{" "}
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
                Options
              </button>
              <button
                onClick={() => stashMember(original.id)}
                className="btn btn-warning btn-outline btn-xs rounded-sm"
              >
                Stash
              </button>
            </div>
          );
        },
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const defaultColumn: Partial<ColumnDef<MembersEntity>> = {
    cell: ({ getValue, row: { index, original }, column: { id }, table }) => {
      const initialValue = getValue();

      // We need to keep and update the state of the cell normally
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const [value, setValue] = useState(initialValue);

      // When the input is blurred, we'll call our table meta's updateData function
      const onBlur = () => {
        table.options.meta?.updateData(index, id, value);
      };

      // const nameOnChange = (e) => {
      //   setName(e.target.value);
      // };

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
              toast.success("Member name updated successfully");
            },
          }
        );
        // updateMyData(index, id, value, original);
      };
      // If the initialValue is changed external, sync it up with our state
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useEffect(() => {
        setValue(initialValue);
      }, [initialValue]);

      if (id === "name") {
        return (
          <form>
            <input
              className="m-0 border-0 bg-transparent p-0"
              value={value as string}
              onChange={(e) => setValue(e.target.value)}
              onBlur={onBlur}
            />
            <button type="submit" onClick={submitName} className="hidden" />
          </form>
        );
      }
      if (id === "ipAssignments") {
        if (!original.ipAssignments || !original.ipAssignments.length)
          return <p className="text-gray-500">Not assigned</p>;

        return (
          <div className="space-y-1">
            {original?.ipAssignments.map((assignedIp) => {
              const subnetMatch = isIPInSubnet(
                assignedIp,
                networkById.network?.routes[0]?.target
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
                        toast.success(`${assignedIp} copied to clipboard`)
                      }
                      title="copy to clipboard"
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
    setData(networkById.members);
  }, [networkById.members]);

  const [data, setData] = React.useState(networkById.members);
  const table = useReactTable({
    data,
    //@ts-expect-error
    columns,
    //@ts-expect-error
    defaultColumn,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(), //order doesn't matter anymore!
    state: {
      sorting,
    },
    meta: {
      updateData: (rowIndex, columnId, value) => {
        // Skip page index reset until after next rerender
        // skipAutoResetPageIndex()
        setData((old) =>
          old.map((row, index) => {
            if (index === rowIndex) {
              return {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                ...old[rowIndex]!,
                [columnId]: value,
              };
            }
            return row;
          })
        );
      },
    },
  });
  return (
    <span className="rounded-xl pt-2">
      <table className="w-full divide-y divide-gray-400 overflow-x-auto border border-gray-500 ">
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
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.original.id}
                className={`items-center ${
                  !row.original.authorized
                    ? "border-dotted bg-error bg-opacity-20"
                    : ""
                }`}
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
            ))
          }
        </tbody>
      </table>
    </span>
  );
};
