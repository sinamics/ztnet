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
import Modal from "../elements/modal";
import { useModalStore } from "~/utils/store";
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
  const { description, callModal } = useModalStore((state) => state);

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
  const deleteNetworkHandler = (nwid) => {
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
                            onClick={() =>
                              callModal({
                                title: "Delete Network?",
                                description:
                                  "Are you sure you want to delete this network?",
                                yesAction: () => {
                                  deleteNetworkHandler(row.original.nwid);
                                },
                              })
                            }
                            className="btn-error btn-xs btn z-20"
                          >
                            Delete
                          </button>
                        ) : (
                          <span onClick={() => handleRowClick(row)}>
                            {cell.render("Cell")}
                          </span>
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
