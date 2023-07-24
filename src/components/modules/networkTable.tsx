/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { useRouter } from "next/router";
import {
  useMemo,
  useState,
  useRef,
  useEffect,
  useCallback,
  useReducer,
} from "react";

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
import { makeNetworkData } from "../../utils/fakeData";

function useSkipper() {
  const shouldSkipRef = useRef(true);
  const shouldSkip = shouldSkipRef.current;

  // Wrap a function with this to skip a pagination reset temporarily
  const skip = useCallback(() => {
    shouldSkipRef.current = false;
  }, []);

  useEffect(() => {
    shouldSkipRef.current = true;
  });

  return [shouldSkip, skip] as const;
}

export const NetworkTable = ({ tableData = [] }) => {
  const router = useRouter();
  const rerender = useReducer(() => ({}), {})[1];
  const [sorting, setSorting] = useState<SortingState>([
    {
      id: "nwid",
      desc: true,
    },
  ]);
  const columnHelper = createColumnHelper<UserNetworkTable>();
  const columns = useMemo(
    () => [
      columnHelper.accessor("nwname", {
        cell: (info) => info.getValue(),
        header: () => <span>Name</span>,
      }),
      columnHelper.accessor("description", {
        cell: (info) => info.getValue(),
        header: () => <span>Description</span>,
      }),
      columnHelper.accessor("nwid", {
        cell: (info) => info.getValue(),
        header: () => <span>Network ID</span>,
        // footer: (info) => info.column.id,
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

  // const [data, setData] = useState(items);
  const [data, setData] = useState(() => makeNetworkData(1000));
  // const tabledata = useMemo(() => data, [data]);
  // const refreshData = () => setData(() => tableData);

  const [autoResetPageIndex, skipAutoResetPageIndex] = useSkipper();
  const table = useReactTable({
    columns,
    data,
    // onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex,
    meta: {
      updateData: (rowIndex, columnId, value) => {
        // Skip page index reset until after next rerender
        skipAutoResetPageIndex();
        setData((old) =>
          old.map((row, index) => {
            if (index === rowIndex) {
              return {
                ...old[rowIndex]!,
                [columnId]: value,
              };
            }
            return row;
          })
        );
      },
    },
    state: {
      sorting,
    },
    debugTable: true,
  });
  const handleRowClick = (nwid: string) => {
    void router.push(`/network/${nwid}`);
  };

  return (
    <div className="inline-block w-full p-1.5 text-center align-middle">
      <div className="overflow-hidden rounded-lg border border-base-200/50">
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
            {table.getRowModel().rows.map((row) => {
              return (
                <tr
                  key={row.id}
                  onClick={() => handleRowClick(row.original.nwid as string)}
                  className="cursor-pointer border-base-300/50 hover:bg-secondary hover:bg-opacity-25"
                >
                  {row.getVisibleCells().map((cell) => {
                    return (
                      <td key={cell.id} className="p-2">
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

        <div className="flex items-center justify-between py-3">
          <div className="space-x-3 p-2">
            <button
              className="btn btn-primary btn-outline btn-sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              {"<<"}
            </button>
            <button
              className="btn btn-primary btn-outline btn-sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              {"<"}
            </button>
            <button
              className="btn btn-primary btn-outline btn-sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              {">"}
            </button>
            <button
              className="btn btn-primary btn-outline btn-sm"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              {">>"}
            </button>
          </div>
          <div className="space-x-3 p-2">
            <select
              className="select select-bordered select-sm"
              value={table.getState().pagination.pageSize}
              onChange={(e) => {
                table.setPageSize(Number(e.target.value));
              }}
            >
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  Show {pageSize}
                </option>
              ))}
            </select>
          </div>
          <div className="space-x-3 p-2">
            <span className="flex items-center gap-1 text-xs">
              <div>Page</div>
              <strong>
                {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount()}
              </strong>
            </span>
          </div>
        </div>
        {/* <div>{table.getRowModel().rows.length} Rows</div>
        <div>
          <button onClick={() => rerender()}>Force Rerender</button>
        </div>
        <div>
          <button onClick={() => refreshData()}>Refresh Data</button>
        </div> */}
      </div>
    </div>
  );
};
