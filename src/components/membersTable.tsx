/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/jsx-key */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { useRouter } from "next/router";
import React, { useState, useMemo } from "react";
import TimeAgo from "react-timeago";
import {
  useTable,
  useBlockLayout,
  useResizeColumns,
  type Column,
} from "react-table";
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

export const MembersTable = ({
  tableData = { ip: [] },
  nwid,
  cidr,
  setEditing,
}: any) => {
  const router = useRouter();
  const { mutate: updateMember } =
    api.network.memberUpdateDatabaseOnly.useMutation();
  // const defaultColumn = React.useMemo(
  //   () => ({
  //     minWidth: 200,
  //     width: 150,
  //     // maxWidth: "100%",
  //   }),
  //   []
  // );
  const columns: Column<Network>[] = useMemo(
    () => [
      {
        Header: "Authorized",
        // accessor: "authorized",
        accessor: (d) => (
          <label className="label cursor-pointer justify-center">
            <input
              type="checkbox"
              checked
              onChange={() => console.log("click")}
              // className="checkbox-error checkbox"
              className="checkbox-success checkbox checkbox-xs sm:checkbox-sm"
            />
          </label>
        ),
        // maxWidth: 200,
        // width: 150,
      },
      {
        Header: "Member name",
        accessor: "name",
        width: 300,
      },
      {
        Header: "ID",
        accessor: (d) => d["id"],
        // maxWidth: 200,
        // width: 150,
      },
      {
        Header: "IP / Latency",
        accessor: ({ ipAssignments }) => {
          if (!ipAssignments || !ipAssignments.length)
            return <span>waiting for IP ...</span>;
        },
        // width: 200,
      },
      {
        Header: "Created",
        accessor: (d) => <TimeAgo date={d["creationTime"]} />,
      },
      {
        Header: "Conn Status",
        accessor: ({ conStatus, peers, lastseen }) => {
          if (conStatus === 1) {
            return (
              <span
                style={{ cursor: "pointer" }}
                className="cursor-pointer text-warning"
                title="Could not establish direct connection and is currently
                           being Relayed through zerotier servers with higher latency"
              >
                RELAYED
              </span>
            );
          }

          if (conStatus === 2) {
            return (
              <span
                style={{ cursor: "pointer" }}
                className="text-success"
                title="Direct connection established"
              >
                DIRECT (v{peers?.version})
              </span>
            );
          }

          // remove the timeago suffix
          const formatTime = (value: any, unit: string) => `${value} ${unit}`;
          return (
            <span
              style={{ cursor: "pointer" }}
              className="text-error"
              title="User is offline"
            >
              offline <TimeAgo date={lastseen} formatter={formatTime} />
            </span>
          );
        },
      },
      {
        Header: "Action",
        accessor: (d) => {
          return (
            <button className="btn-error btn-xs rounded-sm">Delete</button>
          );
        },
      },
    ],
    []
  );
  const updateMyData = (index, id, value, original) => {
    updateMember({
      nwid,
      nodeid: original.nodeid,
      newName: value,
    });
  };

  // Create an editable cell renderer
  const EditableCell = ({
    value: initialValue,
    row: { index, original },
    column: { id },
    // updateMyData, // This is a custom function that we supplied to our table instance
  }) => {
    // We need to keep and update the state of the cell normally
    const [value, setValue] = React.useState(initialValue);

    const onChange = (e) => {
      setValue(e.target.value);
    };

    // We'll only update the external data when the input is blurred
    const onBlur = () => {
      updateMyData(index, id, value, original);
    };

    // If the initialValue is changed external, sync it up with our state
    React.useEffect(() => {
      setValue(initialValue);
    }, [initialValue]);

    if (id === "name") {
      return (
        <input
          className="m-0 border-0 bg-transparent p-0"
          value={value}
          onChange={onChange}
          onBlur={onBlur}
        />
      );
    }
    return value;
  };
  // Set our editable cell renderer as the default Cell renderer
  const defaultColumn = {
    Cell: EditableCell,
  };

  const data = useMemo(() => tableData, [tableData]);
  // console.log(data);
  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } =
    useTable(
      {
        columns,
        data,
        defaultColumn,
      },
      useBlockLayout,
      useResizeColumns
      // updateMyData
    );

  return (
    // <>
    //   <div>
    //     <div
    //       {...getTableProps()}
    //       className="border-spacing-0 border text-center"
    //     >
    //       <div>
    //         {headerGroups.map((headerGroup) => (
    //           <div
    //             {...headerGroup.getHeaderGroupProps()}
    //             className="border-b border-r"
    //           >
    //             {headerGroup.headers.map((column) => (
    //               <div
    //                 {...column.getHeaderProps()}
    //                 className=" border uppercase text-primary "
    //               >
    //                 {column.render("Header")}
    //                 {/* Use column.getResizerProps to hook up the events correctly */}
    //                 <div {...column.getResizerProps()} className="" />
    //               </div>
    //             ))}
    //           </div>
    //         ))}
    //       </div>

    //       <div {...getTableBodyProps()} className="text-center">
    //         {rows.map((row, i) => {
    //           prepareRow(row);
    //           return (
    //             <div {...row.getRowProps()} className="last:border-b-0">
    //               {row.cells.map((cell) => {
    //                 return (
    //                   <div
    //                     className="rounded-sm border-b border-r p-0 last:border-0"
    //                     {...cell.getCellProps()}
    //                   >
    //                     {cell.render("Cell")}
    //                   </div>
    //                 );
    //               })}
    //             </div>
    //           );
    //         })}
    //       </div>
    //     </div>
    //   </div>
    // </>
    <div className="flex flex-col ">
      <div className="overflow-x-auto">
        <div className="flex justify-between py-3 pl-2">
          <div className="relative max-w-xs">
            <label htmlFor="hs-table-search" className="sr-only">
              Search
            </label>
            <input
              type="text"
              name="hs-table-search"
              id="hs-table-search"
              className="block w-full rounded-md border-gray-200 p-3 pl-10 text-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
              placeholder="Search..."
            />
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <svg
                className="h-3.5 w-3.5 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
              </svg>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <button className="focus:ring-accent-500 focus:border-accent-500 relative z-0 inline-flex rounded-md text-sm shadow-sm hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-1">
                <span className="relative inline-flex items-center space-x-2 rounded-md border border-gray-300 bg-white px-3 py-3 text-sm font-medium text-gray-600 sm:py-2">
                  <div>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                      />
                    </svg>
                  </div>
                  <div className="hidden sm:block">Filters</div>
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="inline-block w-full p-1.5 text-center align-middle">
          <div className="overflow-hidden rounded-lg border">
            <table
              {...getTableProps()}
              className="table-wrapper min-w-full divide-y divide-gray-400"
            >
              <thead className="bg-base-100">
                {
                  // Loop over the header rows
                  headerGroups.map((headerGroup) => (
                    // Apply the header row props
                    <tr {...headerGroup.getHeaderGroupProps()}>
                      {
                        // Loop over the headers in each row
                        headerGroup.headers.map((column) => (
                          <th
                            {...column.getHeaderProps()}
                            scope="col"
                            className="py-3 pl-4"
                          >
                            {/* <div className="flex h-5 items-center">
                      <input
                        id="checkbox-all"
                        type="checkbox"
                        className="rounded border-gray-200 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="checkbox" className="sr-only">
                        Checkbox
                      </label>
                    </div> */}
                            {
                              // Render the header
                              column.render("Header")
                            }
                          </th>
                        ))
                      }
                    </tr>
                  ))
                }
              </thead>
              <tbody
                {...getTableBodyProps()}
                className=" divide-y divide-gray-200"
              >
                {
                  // Loop over the table rows
                  rows.map((row) => {
                    // Prepare the row for display
                    prepareRow(row);
                    return (
                      // Apply the row props
                      <tr
                        className={`items-center ${
                          !row.authorized
                            ? "border-dotted bg-error bg-opacity-20"
                            : ""
                        }`}
                        {...row.getRowProps()}
                      >
                        {
                          // Loop over the rows cells
                          row.cells.map((cell) => {
                            // Apply the cell props
                            return (
                              <td
                                {...cell.getCellProps()}
                                className="py-1 pl-4"
                              >
                                {
                                  // Render the cell contents
                                  cell.render("Cell")
                                }
                                {/* <div className="flex h-5 items-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-200 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="checkbox" className="sr-only">
                        Checkbox
                      </label>
                    </div> */}
                              </td>
                            );
                          })
                        }
                        {/* <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-800">
                    1
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                    Jone Doe
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                    jonne62@gmail.com
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <a className="text-green-500 hover:text-green-700" href="#">
                      Edit
                    </a>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <a className="text-red-500 hover:text-red-700" href="#">
                      Delete
                    </a>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pl-4">
                    <div className="flex h-5 items-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-200 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="checkbox" className="sr-only">
                        Checkbox
                      </label>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-800">
                    1
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                    Jone Doe
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                    jonne62@gmail.com
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <a className="text-green-500 hover:text-green-700" href="#">
                      Edit
                    </a>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <a className="text-red-500 hover:text-red-700" href="#">
                      Delete
                    </a>
                  </td> */}
                      </tr>
                    );
                  })
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
