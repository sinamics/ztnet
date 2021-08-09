import React from 'react';
import { columns } from './columns';
import PropTypes from 'prop-types';
import BootstrapTable from 'react-bootstrap-table-next';
import paginationFactory from 'react-bootstrap-table2-paginator';
import ToolkitProvider, { Search } from 'react-bootstrap-table2-toolkit';
//@ts-ignore
import cellEditFactory from 'react-bootstrap-table2-editor';
import 'react-bootstrap-table2-paginator/dist/react-bootstrap-table2-paginator.min.css';
import { useUpdateUserMutation } from 'src/graphql/generated/dist';

const { SearchBar } = Search;

export const Table: any = ({ tableData = {} }: any) => {
  const userTableDataFromDatabase = JSON.parse(JSON.stringify(tableData));
  const [updateUser, { error: updateError }] = useUpdateUserMutation();

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
      dataField: 'createdDate', // if dataField is not match to any column you defined, it will be ignored.
      order: 'desc', // desc or asc
    },
  ];

  const beforeSaveCell = async (_oldValue: any, newValue: string, row: any, column: { dataField: any }, _done: any) => {
    switch (column.dataField) {
      case 'licenseStatus':
        if (!newValue) return { async: true };
        return updateUser({
          variables: {
            userid: row.userid,
            user: {
              licenseStatus: newValue,
            },
          },
        }).catch((err) => console.log(err));
      case 'role':
        if (!newValue) return { async: true };
        return updateUser({
          variables: {
            userid: row.userid,
            user: {
              role: newValue,
            },
          },
        }).catch((err) => console.log(err));

      case 'action':
        if (!newValue) return { async: true };
        // console.log(newValue);
        return newValue;
      default:
        return { async: true };
    }
  };

  const rowStyle = { cursor: 'pointer' };

  return (
    <ToolkitProvider keyField='userid' columns={columns} data={userTableDataFromDatabase} search>
      {(props) => (
        <div>
          {updateError && <div className='text-danger text-center'>{updateError.message}</div>}
          <SearchBar {...props.searchProps} />
          <BootstrapTable
            cellEdit={cellEditFactory({
              mode: 'click',
              blurToSave: true,
              beforeSaveCell,
            })}
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

Table.propTypes = {
  refresh: PropTypes.func,
};

export default Table;
