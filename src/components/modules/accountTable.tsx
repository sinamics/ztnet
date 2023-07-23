import { useMemo, useState, useEffect, type ReactNode } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
} from "@tanstack/react-table";
import { api } from "~/utils/api";
import { type MembersEntity } from "~/types/network";
import { type ErrorData } from "~/types/errorHandling";
import toast from "react-hot-toast";
import { useModalStore } from "~/utils/store";

export const Accounts = () => {
  const { data: members, refetch: refetchUsers } =
    api.admin.getUsers.useQuery();
  const columnHelper = createColumnHelper<MembersEntity>();
  const columns = useMemo<ColumnDef<MembersEntity>[]>(
    () => [
      columnHelper.accessor("id", {
        header: () => <span>ID</span>,
        id: "id",
      }),
      columnHelper.accessor("name", {
        header: () => <span>Member name</span>,
        id: "name",
      }),
      columnHelper.accessor("email", {
        header: () => <span>Email</span>,
        id: "email",
      }),
      columnHelper.accessor("emailVerified", {
        header: () => <span>Email Verified</span>,
        id: "emailVerified",
        cell: ({ getValue }) => {
          if (getValue()) {
            return "Yes";
          }

          return "No";
        },
      }),
      columnHelper.accessor("online", {
        header: () => <span>Online</span>,
        id: "online",
        cell: ({ getValue }) => {
          if (getValue()) {
            return "Yes";
          }

          return "No";
        },
      }),
      columnHelper.accessor("role", {
        header: () => <span>Role</span>,
        id: "role",
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Create an editable cell renderer
  const defaultColumn: Partial<ColumnDef<MembersEntity>> = {
    cell: ({
      getValue,
      row: {
        index,
        original: { id: userid, name },
      },
      column: { id },
    }) => {
      const initialValue = getValue();
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const { callModal } = useModalStore((state) => state);

      // We need to keep and update the state of the cell normally
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const [value, setValue] = useState(initialValue);
      const { mutate: changeRole } = api.admin.changeRole.useMutation({
        onSuccess: () => {
          void refetchUsers();
          toast.success("Role changed successfully");
        },
        onError: (error) => {
          if ((error.data as ErrorData)?.zodError) {
            const fieldErrors = (error.data as ErrorData)?.zodError.fieldErrors;
            for (const field in fieldErrors) {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-call
              toast.error(`${fieldErrors[field].join(", ")}`);
            }
          } else if (error.message) {
            toast.error(error.message);
          } else {
            toast.error("An unknown error occurred");
          }
          void refetchUsers();
        },
      });
      const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value);
      };
      const onBlur = () => {
        table.options.meta?.updateData(index, id, value);
      };
      const dropDownHandler = (
        e: React.ChangeEvent<HTMLSelectElement>,
        id: number
      ) => {
        let description = "";

        if (e.target.value === "ADMIN") {
          description =
            "As an admin, this user will have full permissions, including access to the admin panel.";
        } else if (e.target.value === "USER") {
          description =
            "If set to User, this user will have limited permissions and will not be able to access the admin panel.";
        }

        callModal({
          title: `Change role for ${name}`,
          description,
          yesAction: () => {
            changeRole({
              id,
              role: e.target.value,
            });
          },
        });
      };

      // eslint-disable-next-line react-hooks/rules-of-hooks
      useEffect(() => {
        setValue(initialValue);
      }, [initialValue]);

      if (id === "name") {
        return (
          <input
            className="m-0 border-0 bg-transparent p-0"
            value={value as string}
            onChange={onChange}
            onBlur={onBlur}
          />
        );
      }
      if (id === "role") {
        return (
          <select
            onChange={(e) => dropDownHandler(e, parseInt(userid))}
            className="select select-ghost max-w-xs"
          >
            {value as ReactNode}

            <option>ADMIN</option>
            <option>USER</option>
          </select>
        );
      }
      return value;
    },
  };

  const data = useMemo(() => members || [], [members]);
  const table = useReactTable({
    data,
    //@ts-expect-error
    columns,
    //@ts-expect-error
    defaultColumn,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(), //order doesn't matter anymore!
  });

  return (
    <div className="mx-auto flex w-full flex-col justify-center space-y-5 bg-base-100 p-3 sm:w-8/12">
      <div className="overflow-x-auto">
        {/* <div className="flex justify-between py-3 pl-2"> */}
        {/* <div className="relative max-w-xs">
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
          </div> */}

        {/* <div className="flex items-center space-x-2">
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
        </div> */}

        <div className="inline-block w-full p-1.5 text-center align-middle">
          <div className="overflow-hidden rounded-lg border">
            <table className="table-wrapper min-w-full divide-y divide-gray-400">
              <thead className="bg-base-100">
                {
                  // Loop over the header rows
                  table.getHeaderGroups().map((headerGroup) => (
                    // Apply the header row props
                    <tr key={headerGroup.id}>
                      {
                        // Loop over the headers in each row
                        headerGroup.headers.map((header) => (
                          <th
                            key={header.id}
                            colSpan={header.colSpan}
                            scope="col"
                            className="bg-base-300/50 py-3 pl-4"
                          >
                            {header.isPlaceholder ? null : (
                              <div
                                {...{
                                  className: header.column.getCanSort()
                                    ? "cursor-pointer select-none"
                                    : "",
                                  onClick:
                                    header.column.getToggleSortingHandler(),
                                }}
                              >
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                                {{
                                  asc: " 🔼",
                                  desc: " 🔽",
                                }[header.column.getIsSorted() as string] ??
                                  null}
                              </div>
                            )}
                          </th>
                        ))
                      }
                    </tr>
                  ))
                }
              </thead>
              <tbody className=" divide-y divide-gray-200">
                {
                  // Loop over the table rows
                  table.getRowModel().rows.map((row) => (
                    <tr key={row.original.id} className={`items-center`}>
                      {
                        // Loop over the rows cells
                        row.getVisibleCells().map((cell) => (
                          // Apply the cell props

                          <td key={cell.id} className="py-1 pl-4">
                            {
                              // Render the cell contents
                              flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )
                            }
                          </td>
                        ))
                      }
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
