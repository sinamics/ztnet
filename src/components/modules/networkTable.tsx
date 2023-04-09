/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { useRouter } from "next/router";
import { useMemo } from "react";
import { useTable, type Column } from "react-table";

interface Network {
  nwid: string;
  nwname: string;
}

export const NetworkTable = ({ tableData = [] }) => {
  const router = useRouter();
  const columns: Column<Network>[] = useMemo(
    () => [
      {
        Header: "Network ID",
        accessor: "nwid",
      },
      {
        Header: "Name",
        accessor: "nwname",
      },
      {
        Header: "Members",
        accessor: ({ network_members }) => {
          if (!Array.isArray(network_members)) return <span>0</span>;
          return <span>{network_members.length}</span>;
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const data = useMemo(() => tableData, [tableData]);
  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } =
    useTable({
      columns,
      data,
      initialState: {
        sortBy: [
          {
            id: "nwid",
            desc: false,
          },
        ],
      },
    });

  const handleRowClick = (nwid: string) => {
    void router.push(`/network/${nwid}`);
  };

  return (
    <div className="inline-block w-full p-1.5 text-center align-middle">
      <div className="overflow-hidden rounded-lg border">
        <table
          {...getTableProps()}
          className="table-wrapper min-w-full divide-y "
        >
          <thead className="">
            {headerGroups.map((headerGroup, key: number) => (
              <tr key={key} {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map((column, key: number) => (
                  <th
                    key={key}
                    {...column.getHeaderProps()}
                    scope="col"
                    className="px-6 py-3 text-center text-xs uppercase tracking-wider"
                  >
                    {column.render("Header")}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody {...getTableBodyProps()} className="divide-y ">
            {rows.map((row, key) => {
              prepareRow(row);
              return (
                <tr
                  key={key}
                  {...row.getRowProps()}
                  onClick={() => handleRowClick(row.original.nwid as string)}
                  className="cursor-pointer hover:bg-secondary hover:bg-opacity-25"
                >
                  {row.cells.map((cell, key) => {
                    return (
                      <td
                        key={key}
                        {...cell.getCellProps()}
                        className="whitespace-nowrap border border-primary px-6 py-2 text-sm"
                      >
                        {cell.render("Cell")}
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
