import { type Table } from "@tanstack/react-table";
import React from "react";
import { useTranslation } from "react-i18next";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BackForwardBtn = ({ table }: { table: Table<any> }) => (
  <>
    <button
      className="btn btn-primary btn-outline btn-sm"
      onClick={() => table.setPageIndex(0)}
      disabled={!table.getCanPreviousPage()}
    >
      {"<<"}
    </button>
    <button
      className="btn btn-primary btn-outline btn-sm"
      onClick={() => table.previousPage()}
      disabled={!table.getCanPreviousPage()}
    >
      {"<"}
    </button>
    <button
      className="btn btn-primary btn-outline btn-sm"
      onClick={() => table.nextPage()}
      disabled={!table.getCanNextPage()}
    >
      {">"}
    </button>
    <button
      className="btn btn-primary btn-outline btn-sm"
      onClick={() => table.setPageIndex(table.getPageCount() - 1)}
      disabled={!table.getCanNextPage()}
    >
      {">>"}
    </button>
  </>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TableFooter = ({ table }: { table: Table<any> }) => {
  // In your component...
  const { t } = useTranslation(); // use the 'footer' namespace
  return (
    <>
      <div className="space-x-3 p-2">
        <BackForwardBtn table={table} />
      </div>
      <div className="space-x-3 p-2">
        <select
          className="select select-bordered select-sm"
          value={table.getState().pagination.pageSize}
          onChange={(e) => {
            table.setPageSize(Number(e.target.value));
          }}
        >
          {[10, 20, 30, 40, 50].map((pageSize) => (
            <option key={pageSize} value={pageSize}>
              {t("tableFooter.show")} {pageSize}
            </option>
          ))}
        </select>
      </div>
      <div className="space-x-3 p-2">
        <span className="flex items-center gap-1 text-xs">
          <div>{t("tableFooter.page")}</div>
          <strong>
            {table.getState().pagination.pageIndex + 1} {t("tableFooter.of")}{" "}
            {table.getPageCount()}
          </strong>
        </span>
      </div>
    </>
  );
};

export default TableFooter;
