import React from 'react';
import { columns } from './columns';
import BootstrapTable from 'react-bootstrap-table-next';
import paginationFactory from 'react-bootstrap-table2-paginator';
import ToolkitProvider, { Search } from 'react-bootstrap-table2-toolkit';
//@ts-ignore
import cellEditFactory from 'react-bootstrap-table2-editor';
import 'react-bootstrap-table2-paginator/dist/react-bootstrap-table2-paginator.min.css';

const { SearchBar } = Search;

export const ControllerTable: any = ({ tableData = { network: {} }, history }: any) => {
  const userTableDataFromDatabase = JSON.parse(JSON.stringify(tableData));

  let paginationOptions = {
    sizePerPageList: [
      {
        text: 'All',
        value: 15,
      },
    ],
    hideSizePerPage: false,
  };
  const defaultSorted: any = [
    {
      dataField: 'network.creationTime', // if dataField is not match to any column you defined, it will be ignored.
      order: 'desc', // desc or asc
    },
  ];

  const beforeSaveCell = async (_: any, newValue: string, __: any, column: { dataField: any }): Promise<any> => {
    switch (column.dataField) {
      case 'licenseStatus':
        if (!newValue) return { async: true };
        break;
      case 'role':
        if (!newValue) return { async: true };
        break;
      default:
        return { async: true };
    }
  };

  const rowStyle = { cursor: 'pointer' };
  const rowEvents = {
    onClick: (_: any, { network }: any) => {
      history.push(`/network/${network.nwid}`);
    },
  };
  console.log(tableData);
  return (
    <ToolkitProvider keyField='network.id' columns={columns} data={userTableDataFromDatabase} search>
      {(props) => (
        <div>
          {/* {updateError && <div className='text-danger text-center'>{updateError.message}</div>} */}
          <SearchBar {...props.searchProps} />
          <BootstrapTable
            cellEdit={cellEditFactory({
              mode: 'click',
              blurToSave: true,
              beforeSaveCell,
            })}
            rowEvents={rowEvents}
            rowStyle={rowStyle}
            defaultSorted={defaultSorted}
            pagination={paginationFactory(paginationOptions)}
            {...props.baseProps}
            hover
            condensed
          />
        </div>
      )}
    </ToolkitProvider>
  );
};

export default ControllerTable;
