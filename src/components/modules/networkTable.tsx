/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { useRouter } from "next/router";
import { useMemo, useState } from "react";

import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  flexRender,
  // type ColumnDef,
  createColumnHelper,
} from "@tanstack/react-table";
import { type UserNetworkTable } from "~/types/network";

export const NetworkTable = ({ tableData = [] }) => {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([
    {
      id: "nwid",
      desc: true,
    },
  ]);
  const columnHelper = createColumnHelper<UserNetworkTable>();
  const columns = useMemo(
    () => [
      columnHelper.accessor("nwid", {
        cell: (info) => info.getValue(),
        header: () => <span>Network ID</span>,
        // footer: (info) => info.column.id,
      }),
      columnHelper.accessor("nwname", {
        cell: (info) => info.getValue(),
        header: () => <span>Name</span>,
      }),
      columnHelper.accessor("members", {
        header: () => <span>Members</span>,
        cell: ({ row: { original } }) => {
          if (!Array.isArray(original.network_members)) return <span>0</span>;
          return <span>{original.network_members.length}</span>;
        },
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const data = useMemo(() => tableData, [tableData]);
  const table = useReactTable({
    columns,
    data,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(), //order doesn't matter anymore!
    state: {
      sorting,
    },
  });
  const handleRowClick = (nwid: string) => {
    void router.push(`/network/${nwid}`);
  };

  return (
    <div className="inline-block w-full p-1.5 text-center align-middle">
      <div className="overflow-hidden rounded-lg border">
        <table className="min-w-full  divide-y">
          <thead className="">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <th
                      key={header.id}
                      colSpan={header.colSpan}
                      className="bg-base-300/50 p-2 "
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
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y">
            {table
              .getRowModel()
              .rows.slice(0, 10)
              .map((row) => {
                return (
                  <tr
                    key={row.id}
                    onClick={() => handleRowClick(row.original.nwid as string)}
                    className="cursor-pointer hover:bg-secondary hover:bg-opacity-25"
                  >
                    {row.getVisibleCells().map((cell) => {
                      return (
                        <td key={cell.id} className="p-1">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
