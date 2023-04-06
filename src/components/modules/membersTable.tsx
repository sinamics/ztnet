/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable react/jsx-key */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import React, { useMemo } from "react";
import { useTable, useSortBy } from "react-table";
import { api } from "~/utils/api";

export const MembersTable = () => {
  const { data: members } = api.admin.getUsers.useQuery();

  const columns = useMemo(
    () => [
      {
        Header: "ID",
        accessor: (d: string) => d["id"] as string,
      },
      {
        Header: "Member name",
        accessor: "name",
        width: 300,
      },
      {
        Header: "Email",
        accessor: "email",
        width: 300,
      },
      {
        Header: "Email Verified",
        accessor: (d: string) => {
          if (d["emailVerified"]) {
            return "Yes";
          }

          return "No";
        },
        width: 300,
      },
      {
        Header: "Online",
        accessor: (d: string) => {
          if (d["online"]) {
            return "Yes";
          }

          return "No";
        },
        width: 300,
      },
      {
        Header: "role",
        accessor: "role",
      },
    ],
    []
  );

  // Create an editable cell renderer
  const EditableCell = ({
    value: initialValue,
    // row: { original },
    column: { id },
  }) => {
    // We need to keep and update the state of the cell normally
    const [value, setValue] = React.useState<string | number>(initialValue);

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
    };

    // We'll only update the external data when the input is blurred
    const onBlur = () => {
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

  const data = useMemo(() => members || [], [members]);
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
      useSortBy
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
                      <tr className={`items-center`} {...row.getRowProps()}>
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
