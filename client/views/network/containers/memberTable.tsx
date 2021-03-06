import React, { useRef, useState } from 'react';
import BootstrapTable from '../components/table';
//@ts-ignore
import Checkbox from '@material-ui/core/Checkbox';
import {
  NetworkDetailsDocument,
  useMemberUpdateMutation,
  useRemoveMemberMutation,
  useMemberUpdateDatabaseOnlyMutation,
} from 'client/graphql/generated/dist';
import { Button } from 'semantic-ui-react';
import FileCopyOutlinedIcon from '@material-ui/icons/FileCopyOutlined';
//@ts-ignore
import DeleteOutlineIcon from '@material-ui/icons/DeleteOutline';
//@ts-ignore
import { Netmask } from 'netmask';

//@ts-ignore
import { map } from 'lodash';
import TimeAgo from 'react-timeago';
import CopyToClipboard from 'react-copy-to-clipboard';

import 'react-bootstrap-table2-paginator/dist/react-bootstrap-table2-paginator.min.css';
import DeleteIPmodal from './deleteIPmodal';

export const MembersTable = ({ tableData = { ip: [] }, cidr, setEditing }: any) => {
  const [state, setState] = useState<any>([]);
  const copyIPIntercalCleanup = useRef<any>([]);
  const [deleteWarning, setDeleteWarning] = useState<any>({
    viewModal: false,
    memberId: null,
    nwid: null,
    data: { removeIp4index: 0, ipAssignments: null },
  });

  const _tableData = JSON.parse(JSON.stringify(tableData));
  const [updateMember, { error: updateMemberError, loading: loadingUpdateMember }] = useMemberUpdateMutation();
  const [updateMembersDatabase, { error: updateMembersDatabaseError, loading: loadingMemberDatabase }] = useMemberUpdateDatabaseOnlyMutation();
  const [removeMember] = useRemoveMemberMutation();

  const copyClipboard = (ip: string) => {
    setState([...state, ip]);
    copyIPIntercalCleanup.current = setTimeout(() => {
      setState([]);
    }, 2000);
  };
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
      formatter: (cell: any, row: any) => {
        return (
          <Checkbox
            size='small'
            // color='primary'
            style={{ padding: 0, color: 'rgb(253 106 1)' }}
            checked={cell}
            inputProps={{ 'aria-label': 'primary checkbox' }}
            onChange={(e) => {
              updateMember({
                variables: { memberId: row.id, nwid: row.nwid, data: { authorized: e.target.checked } },
                refetchQueries: [{ query: NetworkDetailsDocument, variables: { nwid: row.nwid } }],
              }).catch((err) => console.error(err));
            }}
          />
        );
      },
      editable: false,
      sort: true,
    },
    {
      dataField: 'name',
      text: 'Member name',
      // editable: true,
      align: 'center',
      headerAlign: 'center',
      // editorRenderer: (editorProps: any, value: any) => <CallbackModal {...editorProps} value={value} />,
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
      text: 'IP / Latency',
      align: 'center',
      headerAlign: 'center',
      headerStyle: () => {
        return { width: '20%' };
      },
      editable: false,
      formatter: (ipAssignments: any, row: any) => {
        if (!ipAssignments || !ipAssignments.length) return <span>waiting for IP ...</span>;
        return map(ipAssignments, (ip, key: number) => {
          const block = new Netmask(cidr);
          return (
            <div key={ip} className='d-flex justify-content-center align-items-center'>
              <div className='d-flex align-self-end'>
                {true ? (
                  <CopyToClipboard text={ip} onCopy={() => copyClipboard(ip)}>
                    <span style={{ cursor: 'pointer', paddingLeft: 10, color: 'rgb(253 106 1)' }}>
                      <span className={`${state.includes(ip) && 'text-muted'} ${block.contains(ip) && 'text-success'}`}>{`${ip}`}</span>
                      <span>{row.peers && row.peers.latency !== -1 && ` (${row.peers?.latency}ms)`}</span>
                      <FileCopyOutlinedIcon fontSize='inherit' titleAccess='Copy IP address' className='ml-1' />
                    </span>
                  </CopyToClipboard>
                ) : (
                  <span style={{ cursor: 'pointer', fontSize: '14px', paddingLeft: 10, color: 'green' }}>copied!</span>
                )}
              </div>
              {ipAssignments.length > 1 ? (
                <div className='d-flex align-self-end'>
                  <DeleteOutlineIcon
                    style={{ cursor: 'pointer', fontSize: '15px', color: '#980909' }}
                    // fontSize='small'
                    className='ml-3'
                    // color='action'
                    onClick={() =>
                      setDeleteWarning({ viewModal: true, memberId: row.id, nwid: row.nwid, data: { removeIp4index: key, ipAssignments } })
                    }
                  />
                </div>
              ) : null}
            </div>
          );
        });
      },
    },
    {
      dataField: 'creationTime',
      text: 'Created',
      editable: false,
      align: 'center',
      headerStyle: () => {
        return { width: '12%' };
      },
      headerAlign: 'center',
      formatter: (cell: any, _row: any) => {
        return <TimeAgo date={cell} />;
      },
    },
    {
      dataField: 'online',
      text: 'Status / Online',
      align: 'center',
      headerAlign: 'center',
      editable: false,
      sort: true,
      headerStyle: () => {
        return { width: '12%' };
      },
      isDummyField: true,
      formatter: (_: any, row: any) => {
        if (row.peers && row.peers.versionMajor !== -1 && row.peers?.latency !== -1) {
          return <span className='text-success'>Online (v{row.peers?.version})</span>;
        }

        // return <TimeAgo date={row.lastseen} />;
        return <span className='text-danger'>Offline</span>;
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
            basic
            color='red'
            onClick={() =>
              removeMember({
                variables: { nwid: row.nwid, memberId: row.id },
                refetchQueries: [{ query: NetworkDetailsDocument, variables: { nwid: row.nwid } }],
              })
            }
          >
            Delete
          </Button>
        );
      },
      editable: false,
      sort: true,
    },
  ];

  const rowStyle = (row: { authorized: any }): any => {
    if (!row.authorized) return { backgroundColor: 'rgb(83 63 63)', border: '0.01em dotted rgb(155 104 104)' };
  };
  const beforeSaveCell = async (_oldValue: any, newValue: any, row: any, _column: any, _done: any) => {
    const newName = JSON.parse(JSON.stringify(newValue));
    // cancle subscription if user is editing the members table.
    setEditing(false);
    try {
      return updateMembersDatabase({
        variables: { nwid: row.nwid, nodeid: row.nodeid, identity: row.identity, data: { name: newName } },
        refetchQueries: [{ query: NetworkDetailsDocument, variables: { nwid: row.nwid } }],
      });
    } catch (err) {
      return console.error(err);
    }
  };
  const onStartEdit = async (_row: any, _column: any, _done: any) => {
    // cancle subscription if user is editing the members table.
    setEditing(true);
  };

  return (
    <>
      <div style={{ fontSize: '14px', height: '20px' }} className={`text-danger text-center  ${updateMemberError ? 'visible' : 'invisible'}`}>
        <p>{updateMemberError?.message}</p>
      </div>

      <DeleteIPmodal data={deleteWarning} cancle={() => setDeleteWarning((prev: any) => ({ ...prev, viewModal: false }))} />

      <BootstrapTable
        keyField='id'
        columns={columns}
        error={updateMembersDatabaseError}
        beforeSaveCell={beforeSaveCell}
        onStartEdit={onStartEdit}
        rowStyle={rowStyle}
        tableData={_tableData}
        loading={loadingUpdateMember || loadingMemberDatabase}
      />
    </>
  );
};

export default MembersTable;
