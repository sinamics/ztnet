/* eslint-disable react/jsx-key */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { useRouter } from "next/router";
import React, { useState, useMemo } from "react";
import { useTable, type Column } from "react-table";
import { api } from "~/utils/api";
// import { useHistory } from "react-router-dom";
// import "./react-table-styles.css"; // Import the necessary styles for react-table

interface Network {
  nwid: string;
  nwname: string;
}

interface NetworksTableProps {
  tableData?: Network[];
}

interface DeleteNetworkModalProps {
  data: any;
  cancle: () => void;
}

export const NetworkTable = ({ tableData = [] }) => {
  const { mutate: deleteNetwork } = api.network.deleteNetwork.useMutation();
  const { refetch: fetchNetwork } = api.network.getAll.useQuery();

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
        Header: "Actions",
        accessor: "action",
        // Cell: ({ nwid }) => (
        //   <button
        //     onClick={() =>
        //       deleteNetwork({ nwid }, { onSuccess: () => void fetchNetwork() })
        //     }
        //     className="btn-error btn-xs btn z-20"
        //   >
        //     Delete
        //   </button>
        // ),
      },
    ],
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

  const handleRowClick = (row: any) => {
    router.push(`/network/${row.original.nwid}`);
  };
  const deleteNetworkHandler = (event, nwid) => {
    event.stopPropagation();
    if (!nwid) return;

    deleteNetwork({ nwid }, { onSuccess: () => void fetchNetwork() });
  };
  return (
    <div className="inline-block w-full p-1.5 text-center align-middle">
      <div className="overflow-hidden rounded-lg border">
        <table
          {...getTableProps()}
          className="table-wrapper min-w-full divide-y divide-gray-400"
        >
          <thead className="">
            {headerGroups.map((headerGroup) => (
              <tr {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map((column) => (
                  <th
                    {...column.getHeaderProps()}
                    scope="col"
                    className="px-6 py-3 text-left text-xs uppercase tracking-wider "
                  >
                    {column.render("Header")}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody {...getTableBodyProps()} className="divide-y divide-gray-200">
            {rows.map((row) => {
              prepareRow(row);
              return (
                <tr
                  onClick={() => handleRowClick(row)}
                  {...row.getRowProps()}
                  className="cursor-pointer hover:bg-secondary hover:bg-opacity-25"
                >
                  {row.cells.map((cell) => {
                    return (
                      <td
                        {...cell.getCellProps()}
                        className="whitespace-nowrap border border-primary px-6 py-2 text-sm"
                      >
                        {cell.column.id === "action" ? (
                          <button
                            className="btn-error btn-xs btn z-20"
                            onClick={(event) =>
                              deleteNetworkHandler(event, row.original.nwid)
                            }
                          >
                            Delete
                          </button>
                        ) : (
                          cell.render("Cell")
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
