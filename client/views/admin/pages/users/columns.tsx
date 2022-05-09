import React, { useState } from 'react';
import TimeAgo from 'react-timeago';
//@ts-ignore
import { Type } from 'react-bootstrap-table2-editor';
//@ts-ignore
import config from 'config';
import { Button } from 'semantic-ui-react';
import DeleteUserModal from './components/deleteModal';

const RemoveUser = ({ userid }: any) => {
  const [modal, setModal] = useState(false);
  return (
    <>
      <DeleteUserModal userid={userid} open={modal} cancle={() => setModal(false)} />
      <Button
        size='tiny'
        negative
        onClick={(e) => {
          e.stopPropagation();
          setModal(true);
        }}
      >
        Delete
      </Button>
    </>
  );
};
export const columns = [
  {
    dataField: 'userid',
    text: 'id',
    hidden: true,
    editable: false,
  },
  {
    dataField: 'firstname',
    text: 'Firstname',
    editable: false,
  },
  {
    dataField: 'lastname',
    text: 'Lastname',
    editable: false,
  },
  {
    dataField: 'email',
    text: 'Email',
    editable: false,
  },
  {
    dataField: 'lastlogin',
    text: 'Last Seen',
    editable: false,
    formatter: (cell: string | number | Date) => (cell ? <TimeAgo date={cell} /> : ''),
    // sortValue: (cell: any) => (cell ? cell : Math.max()),
    sort: true,
  },
  {
    dataField: 'expirationDate',
    text: 'Expiration Date',
    // width: 5,
    editable: true,
  },
  {
    dataField: 'licenseKey',
    text: 'License Key',
    // width: 5,
    editable: false,
  },
  {
    dataField: 'orderStatus',
    text: 'Order Status',
    // width: 5,
    editable: false,
  },
  {
    dataField: 'licenseStatus',
    text: 'License Status',
    // width: 5,
    editor: {
      type: Type.SELECT,
      getOptions: () => {
        return config.licenseStatus;
      },
    },
  },
  {
    dataField: 'orderId',
    text: 'Order ID',
    // width: 5,
    editable: false,
  },
  {
    dataField: 'role',
    text: 'Role',
    editor: {
      type: Type.SELECT,
      getOptions: () => {
        return config.roles;
      },
    },
  },
  {
    dataField: 'action',
    text: 'Actions',
    isDummyField: false,
    headerStyle: () => {
      return { width: '10%' };
    },
    formatter: (_cell: any, row: any) => {
      return <RemoveUser userid={row.userid} />;
    },
    editable: false,
  },
];
