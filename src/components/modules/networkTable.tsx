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
  // console.log(tableData);
  const router = useRouter();
  const [deleteWarning, setDeleteWarning] = useState({
    open: false,
    nwid: "",
  });

  //   const history = useHistory();

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
        id: "action",
        // Cell: ({ row }) => (
        //   <button
        //     className="rounded bg-red-600 px-2 py-1 text-white"
        //     onClick={(e) => {
        //       e.stopPropagation();
        //       setDeleteWarning({ open: true, nwid: row.original.nwid });
        //     }}
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
    });

  const handleRowClick = (row: any) => {
    // console.log(row);
    router.push(`/network/${row.original.nwid}`);
  };

  return (
    <>
      {/* {deleteWarning.open && (
        <DeleteNetworkModal
          data={deleteWarning}
          cancle={() => setDeleteWarning({ ...deleteWarning, open: false })}
        />
      )} */}
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="">
          {headerGroups.map((headerGroup, key) => (
            <tr key={key}>
              {headerGroup.headers.map((column, key) => (
                <th
                  key={key}
                  // {...column.getHeaderProps()}
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider "
                >
                  {column.render("Header")}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()} className="divide-y divide-gray-200 ">
          {rows.map((row, key) => {
            prepareRow(row);
            return (
              <tr
                key={key}
                onClick={() => handleRowClick(row)}
                className="cursor-pointer hover:bg-secondary"
              >
                {row.cells.map((cell, key) => {
                  return (
                    <td
                      key={key}
                      className="whitespace-nowrap border border-primary px-6 py-4 text-sm"
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
    </>
  );
};
