import React from 'react';
import BootstrapTable from 'react-bootstrap-table-next';
import ToolkitProvider from 'react-bootstrap-table2-toolkit';
//@ts-ignore
import overlayFactory from 'react-bootstrap-table2-overlay';
import { NetworkDetailsDocument, useMemberUpdateDatabaseOnlyMutation, useAddMemberMutation } from 'client/graphql/generated/dist';
import { Button } from 'semantic-ui-react';
//@ts-ignore
import cellEditFactory from 'react-bootstrap-table2-editor';

import TimeAgo from 'react-timeago';

import 'react-bootstrap-table2-paginator/dist/react-bootstrap-table2-paginator.min.css';

export const ZombiesTable = ({ tableData = { ip: [] } }: any) => {
  const _tableData = JSON.parse(JSON.stringify(tableData));

  const [updateMembersDatabase, { error: updateMembersDatabaseError, loading: loadingMemberDatabase }] = useMemberUpdateDatabaseOnlyMutation();
  const [addMemberToDatabase] = useAddMemberMutation();

  const columns: any = [
    {
      dataField: 'identity',
      hidden: true,
    },
    {
      dataField: 'authorized',
      text: 'Authorized',
      align: 'center',
      headerAlign: 'center',
      headerStyle: () => {
        return { width: '10%' };
      },
      formatter: (cell: any) => {
        return cell ? 'Authorized' : 'Not Authorized';
      },
      editable: false,
      sort: true,
    },
    {
      dataField: 'name',
      text: 'Member name',
      editable: false,
      align: 'center',
      headerAlign: 'center',
    },
    {
      dataField: 'id',
      text: 'ID',
      editable: false,
      align: 'center',
      headerAlign: 'center',
    },
    {
      dataField: 'ip',
      text: 'IP Assignments',
      align: 'center',
      headerAlign: 'center',
      editable: false,
    },
    {
      dataField: 'creationTime',
      text: 'Created',
      editable: false,
      align: 'center',
      headerAlign: 'center',
      formatter: (cell: any, _row: any) => {
        return <TimeAgo date={cell} />;
      },
    },
    {
      dataField: 'online',
      text: 'Status',
      align: 'center',
      headerAlign: 'center',
      editable: false,
      sort: true,
      isDummyField: true,
      formatter: (_cell: any) => {
        return <span>Zombie</span>;
      },
    },
    {
      dataField: 'action',
      text: 'Actions',
      align: 'center',
      headerAlign: 'center',
      isDummyField: true,
      formatter: (_cell: any, row: any) => {
        return (
          <Button
            size='tiny'
            variant='contained'
            color='green'
            onClick={() =>
              addMemberToDatabase({
                variables: { nwid: row.nwid, memberId: row.id },
                refetchQueries: [{ query: NetworkDetailsDocument, variables: { nwid: row.nwid } }],
              })
            }
          >
            re-activate
          </Button>
        );
      },
      editable: false,
      sort: true,
    },
  ];

  const rowStyle = (row: { authorized: any }): any => {
    if (!row.authorized) return { backgroundColor: 'grey' };

    // return { border: '0.01em dotted black' };
  };
  const beforeSaveCell = async (_oldValue: any, newValue: any, row: any, _column: any, _done: any) => {
    const newName = JSON.parse(JSON.stringify(newValue));
    try {
      return updateMembersDatabase({
        variables: { nwid: row.nwid, nodeid: row.nodeid, identity: row.identity, data: { name: newName } },
        refetchQueries: [{ query: NetworkDetailsDocument, variables: { nwid: row.nwid } }],
      });
    } catch (err) {
      return console.error(err);
    }
  };

  const defaultSorted = [
    {
      dataField: 'id', // if dataField is not match to any column you defined, it will be ignored.
      order: 'desc', // desc or asc
    },
  ];
  return (
    <>
      {updateMembersDatabaseError && <div className='text-danger text-center'>{updateMembersDatabaseError.message}</div>}
      <ToolkitProvider keyField='id' columns={columns} data={_tableData} search>
        {(props: any) => (
          <div>
            {/* <SearchBar {...props.searchProps} /> */}
            <BootstrapTable
              cellEdit={cellEditFactory({ mode: 'click', blurToSave: true, beforeSaveCell })}
              rowStyle={rowStyle}
              defaultSorted={defaultSorted}
              {...props.baseProps}
              condensed
              loading={loadingMemberDatabase}
              overlay={overlayFactory({ spinner: true, styles: { overlay: (base: any) => ({ ...base, background: '#de9b0440' }) } })}
            />
          </div>
        )}
      </ToolkitProvider>
    </>
  );
};

export default ZombiesTable;
