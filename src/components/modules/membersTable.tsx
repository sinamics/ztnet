/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/jsx-key */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/restrict-template-expressions */

/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import React, { useMemo } from "react";
import TimeAgo from "react-timeago";
import { CopyToClipboard } from "react-copy-to-clipboard";
import {
  useTable,
  useBlockLayout,
  useResizeColumns,
  useSortBy,
} from "react-table";
import { api } from "~/utils/api";
import { toast } from "react-hot-toast";
import { useRouter } from "next/router";
import { isIPInSubnet } from "~/utils/isIpInsubnet";
import { type CustomError } from "~/types/errorHandling";

interface IpAssignmentsProps {
  ipAssignments: string[];
  state: string[];
  id: string;
  nwid: string;
  peers?: { latency: number };
  copyClipboard: (ip: string) => void;
  setDeleteWarning: (args: any) => void;
}

export const MembersTable = ({ nwid }) => {
  const { query } = useRouter();
  const { data: networkById, refetch: refetchNetworkById } =
    api.network.getNetworkById.useQuery(
      {
        nwid,
      },
      { enabled: !!query.id }
    );

  const { mutate: updateMemberDatabaseOnly } =
    api.networkMember.UpdateDatabaseOnly.useMutation();

  const { mutate: updateMember } = api.networkMember.Update.useMutation({
    onError: ({ shape }: CustomError) => {
      // console.log(shape?.data?.zodError.fieldErrors);
      void toast.error(shape?.data?.zodError?.fieldErrors?.updateParams);
    },
    onSuccess: () => refetchNetworkById(),
  });
  const { mutate: removeUser } = api.networkMember.Delete.useMutation({
    onSuccess: () => refetchNetworkById(),
  });

  const deleteIpAssignment = (
    ipAssignments: Array<string>,
    Ipv4: string,
    id: string
  ) => {
    const _ipv4 = [...ipAssignments];
    const newIpPool = _ipv4.filter((r) => r !== Ipv4);

    updateMember({
      updateParams: { ipAssignments: [...newIpPool] },
      memberId: id,
      nwid,
    });
  };

  const deleteMember = (id: string) => {
    removeUser({
      nwid,
      memberId: id,
    });
  };

  const columns = useMemo(
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
        accessor: (d: string) => d["id"],
        // maxWidth: 200,
        // width: 150,
      },
      {
        Header: "IP / Latency",
        width: 170,
        accessor: ({ ipAssignments, peers, id }: IpAssignmentsProps) => {
          if (!ipAssignments || !ipAssignments.length)
            return <span>waiting for IP ...</span>;
          return ipAssignments.map((ip) => {
            const subnetMatch = isIPInSubnet(
              ip,
              networkById.network?.routes[0]?.target
            );

            return (
              <div key={ip} className="flex justify-center text-center">
                {true ? (
                  <div
                    className={`${
                      subnetMatch
                        ? "badge-primary badge badge-lg rounded-md"
                        : "badge-ghost badge badge-lg rounded-md opacity-60"
                    } flex min-w-fit justify-between`}
                  >
                    <CopyToClipboard
                      text={ip}
                      onCopy={() => toast.success(`${ip} copied to clipboard`)}
                      title="copy to clipboard"
                    >
                      <div className="cursor-pointer">{ip}</div>
                    </CopyToClipboard>
                    <div className="text-xs">
                      {peers?.latency > 0 && ` (${peers.latency}ms)`}
                    </div>
                    {ipAssignments.length > 1 && (
                      <div title="delete ip assignment">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.5"
                          stroke="currentColor"
                          className="z-10 ml-4 h-4 w-4 cursor-pointer text-warning"
                          onClick={() =>
                            deleteIpAssignment(ipAssignments, ip, id)
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
                ) : (
                  <span className="cursor-pointer pl-2 text-sm text-green-500">
                    copied!
                  </span>
                )}
              </div>
            );
          });
        },

        // width: 200,
      },
      {
        Header: "Created",
        accessor: (d: string) => <TimeAgo date={d["creationTime"]} />,
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
        accessor: ({ id }) => {
          return (
            <button
              onClick={() => deleteMember(id)}
              className="btn-error btn-xs rounded-sm"
            >
              Delete
            </button>
          );
        },
      },
    ],
    []
  );

  // Create an editable cell renderer
  const EditableCell = ({
    value: initialValue,
    row: { original },
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
          id: original.id,
          updateParams: {
            name: value,
          },
        },
        { onSuccess: () => void refetchNetworkById() }
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

  const data = useMemo(() => networkById.members, [networkById.members]);
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
                              </td>
                            );
                          })
                        }
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
