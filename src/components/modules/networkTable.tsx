/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { useTable, type Column } from "react-table";
import { api } from "~/utils/api";
import { useModalStore } from "~/utils/store";

interface Network {
  nwid: string;
  nwname: string;
}

export const NetworkTable = ({ tableData = [] }) => {
  const { mutate: deleteNetwork } = api.network.deleteNetwork.useMutation();
  const { refetch: fetchNetwork } = api.network.getAll.useQuery();
  const { callModal } = useModalStore((state) => state);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Create an editable cell renderer
  const EditableCell = ({
    value: initialValue,
    row: { original },
    column: { id },
  }) => {
    // We need to keep and update the state of the cell normally
    const [value, setValue] = useState(initialValue);

    // If the initialValue is changed external, sync it up with our state
    useEffect(() => {
      setValue(initialValue);
    }, [initialValue]);

    if (id === "action") {
      return (
        <button
          onClick={() =>
            callModal({
              title: "Delete Network?",
              description: "Are you sure you want to delete this network?",
              yesAction: () => {
                deleteNetworkHandler(original.nwid);
              },
            })
          }
          className="btn-error btn-xs btn z-20"
        >
          Delete
        </button>
      );
    }
    return (
      <span onClick={() => handleRowClick(original.nwid as string)}>
        {value}
      </span>
    );
  };

  const defaultColumn = {
    Cell: EditableCell,
    Row: EditableCell,
  };
  const data = useMemo(() => tableData, [tableData]);
  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } =
    useTable({
      columns,
      data,
      defaultColumn,
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
  const deleteNetworkHandler = (nwid) => {
    if (!nwid) return;

    deleteNetwork({ nwid }, { onSuccess: () => void fetchNetwork() });
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
                  // onClick={() => rowClick(row)}
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
