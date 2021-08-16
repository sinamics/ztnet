import React from 'react';
import Table from 'react-bootstrap-table-next';
import ToolkitProvider, { Search } from 'react-bootstrap-table2-toolkit';
//@ts-ignore
import cellEditFactory from 'react-bootstrap-table2-editor';
//@ts-ignore
import overlayFactory from 'react-bootstrap-table2-overlay';

const { SearchBar } = Search;

type error = {
  message: string;
};

interface ITable {
  error?: error | undefined;
  columns: Array<any>;
  tableData: Array<any>;
  beforeSaveCell?: any;
  defaultSorted?: any;
  pagination?: any;
  rowEvents?: any;
  onStartEdit?: any;
  loading?: boolean;
  rowStyle: any;
  keyField: string;
  search?: boolean;
}

export default function BootstrapTable({
  search,
  keyField,
  error,
  columns,
  tableData,
  beforeSaveCell,
  defaultSorted = [{ dataField: 'id', order: 'desc' }],
  pagination,
  onStartEdit,
  loading,
  rowStyle,
  rowEvents,
  ...rest
}: ITable) {
  return (
    <>
      {error && <div className='text-danger text-center'>{error.message}</div>}
      <ToolkitProvider keyField={keyField} columns={columns} data={tableData} search>
        {(props: any) => (
          <div>
            {search && <SearchBar {...props.searchProps} />}
            <Table
              cellEdit={cellEditFactory({ mode: 'click', blurToSave: true, beforeSaveCell, onStartEdit })}
              rowStyle={rowStyle}
              defaultSorted={defaultSorted}
              pagination={pagination}
              rowEvents={rowEvents}
              {...props.baseProps}
              condensed
              loading={loading}
              overlay={overlayFactory({ spinner: true, styles: { overlay: (base: any) => ({ ...base, background: '#de9b0440' }) } })}
              {...rest}
            />
          </div>
        )}
      </ToolkitProvider>
    </>
  );
}
