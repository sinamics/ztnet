import React, { useState } from 'react';
import BootstrapTable from 'react-bootstrap-table-next';
import paginationFactory from 'react-bootstrap-table2-paginator';
import ToolkitProvider from 'react-bootstrap-table2-toolkit';
import 'react-bootstrap-table2-paginator/dist/react-bootstrap-table2-paginator.min.css';
import { Button } from '@material-ui/core';
import DeleteNetworkModal from './deleteModal';

export const NetworksTable = React.memo(({ tableData = [], history }: any) => {
  const [deleteWarning, setDeleteWarning] = useState<any>({ open: false, nwid: '' });

  let paginationOptions = {
    sizePerPageList: [
      {
        text: 'All',
        value: 10,
      },
    ],
    hideSizePerPage: false,
  };

  const columns = [
    {
      dataField: 'nwid',
      text: 'Network ID',
      hidden: false,
      editable: false,
    },
    {
      dataField: 'nwname',
      text: 'Name',
      editable: false,
    },
    {
      dataField: 'action',
      text: 'Actions',
      isDummyField: false,
      headerStyle: () => {
        return { width: '10%' };
      },
      formatter: (_cell: any, row: any) => {
        return (
          <Button
            size='small'
            variant='contained'
            color='secondary'
            onClick={(e) => {
              e.stopPropagation();
              setDeleteWarning({ open: true, nwid: row.nwid });
            }}
          >
            Delete
          </Button>
        );
      },
      editable: false,
    },
  ];

  const rowEvents = {
    onClick: (_e: any, row: any, _rowIndex: any) => {
      history.push(`/network/${row.nwid}`);
    },
  };

  const rowStyle = { cursor: 'pointer' };
  return (
    <>
      {deleteWarning.open && <DeleteNetworkModal data={deleteWarning} cancle={() => setDeleteWarning({ ...deleteWarning, open: false })} />}
      <ToolkitProvider keyField='nwid' columns={columns} data={tableData} search>
        {(props: any) => (
          <div>
            {/* <SearchBar {...props.searchProps} /> */}
            <BootstrapTable
              rowStyle={rowStyle}
              pagination={paginationFactory(paginationOptions)}
              // defaultSorted={defaultSorted}
              rowEvents={rowEvents}
              {...props.baseProps}
              condensed
            />
          </div>
        )}
      </ToolkitProvider>
    </>
  );
});

export default NetworksTable;
