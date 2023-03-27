/* eslint-disable react-hooks/exhaustive-deps */
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
import { CopyToClipboard } from "react-copy-to-clipboard";
import { Netmask } from "netmask";
import {
  useTable,
  useBlockLayout,
  useResizeColumns,
  useSortBy,
  type Column,
} from "react-table";
import { api } from "~/utils/api";
// import { useHistory } from "react-router-dom";
// import "./react-table-styles.css"; // Import the necessary styles for react-table

interface IpAssignmentsProps {
  ipAssignments: string[];
  state: string[];
  id: string;
  nwid: string;
  peers?: { latency: number };
  copyClipboard: (ip: string) => void;
  setDeleteWarning: (args: any) => void;
}
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
  refetchNetworkById,
  cidr,
  setEditing,
}: any) => {
  const router = useRouter();
  const { mutate: updateMemberDatabaseOnly } =
    api.network.memberUpdateDatabaseOnly.useMutation();

  const { mutate: updateMember } = api.network.memberUpdate.useMutation();
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
        accessor: ({ id, authorized }) => {
          return (
            <label className="label cursor-pointer justify-center">
              <input
                type="checkbox"
                checked={authorized}
                onChange={(event) =>
                  updateMember(
                    {
                      nwid,
                      memberId: id,
                      data: { authorized: event.target.checked },
                    },
                    { onSuccess: () => refetchNetworkById() }
                  )
                }
                // className="checkbox-error checkbox"
                className="checkbox-success checkbox checkbox-xs sm:checkbox-sm"
              />
            </label>
          );
        },
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
        width: 150,
        accessor: ({ ipAssignments, peers }: IpAssignmentsProps) => {
          if (!ipAssignments || !ipAssignments.length)
            return <span>waiting for IP ...</span>;
          return ipAssignments.map((ip, key) => {
            const block = new Netmask(cidr);
            console.log(peers);
            return (
              <div key={ip}>
                {true ? (
                  <CopyToClipboard
                    text={ip}
                    onCopy={() => console.log(ip)}
                    title="copy to clipboard"
                  >
                    <div className="badge-primary badge badge-lg flex w-full cursor-pointer items-center justify-between rounded-md pl-2 text-center">
                      <div className={`${block.contains(ip) ? "" : ""}`}>
                        {ip}
                      </div>
                      <div className="text-xs">
                        {peers?.latency > 0 && ` (${peers.latency}ms)`}
                      </div>
                      <div>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.5"
                          stroke="currentColor"
                          className="h-5 w-5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"
                          />
                        </svg>
                      </div>
                    </div>
                  </CopyToClipboard>
                ) : (
                  <span className="cursor-pointer pl-2 text-sm text-green-500">
                    copied!
                  </span>
                )}

                {ipAssignments.length > 1 && (
                  <div className="flex items-end">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      className="h-6 w-6 text-warning"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                      />
                    </svg>
                    {/* <DeleteOutlineIcon
                      className="cursor-pointer text-[15px] text-red-600 ml-3"
                      onClick={() =>
                        setDeleteWarning({ viewModal: true, memberId: id, nwid: nwid, data: { removeIp4index: key, ipAssignments } })
                      }
                    /> */}
                  </div>
                )}
              </div>
            );
          });
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

  // Create an editable cell renderer
  const EditableCell = ({
    value: initialValue,
    row: { index, original },
    column: { id },
  }) => {
    // We need to keep and update the state of the cell normally
    const [value, setValue] = React.useState(initialValue);

    const onChange = (e) => {
      setValue(e.target.value);
    };

    // We'll only update the external data when the input is blurred
    const onBlur = () => {
      updateMemberDatabaseOnly(
        {
          nwid,
          nodeid: original.nodeid,
          newName: value,
        },
        { onSuccess: () => refetchNetworkById() }
      );
      // updateMyData(index, id, value, original);
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
  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } =
    useTable(
      {
        columns,
        data,
        defaultColumn,
        initialState: {
          sortBy: [
            {
              id: "id",
              desc: false,
            },
          ],
        },
      },
      useBlockLayout,
      useResizeColumns,
      useSortBy
      // updateMyData
    );

  return (
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
                            {...column.getHeaderProps(
                              column.getSortByToggleProps()
                            )}
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
                            <span>
                              {column.isSorted
                                ? column.isSortedDesc
                                  ? " 🔽"
                                  : " 🔼"
                                : ""}
                            </span>
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
                          !row.original.authorized
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
