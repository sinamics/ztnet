import React from 'react';
import TimeAgo from 'react-timeago';
export const columns = [
  {
    dataField: 'network.id',
    text: 'nwid',
    hidden: false,
    editable: false,
  },
  {
    dataField: 'author.nw_userid.firstname',
    text: 'Author',
    hidden: false,
    editable: false,
  },
  {
    dataField: 'network.name',
    text: 'Name',
    editable: false,
  },
  {
    dataField: 'network.private',
    text: 'Private',
    sort: true,
    editable: false,
  },
  {
    dataField: 'network.creationTime',
    text: 'Created',
    sort: true,
    editable: false,
    formatter: (cell) => {
      return <TimeAgo date={cell} />;
    },
  },
  {
    dataField: 'members',
    text: 'Members',
    sort: true,
    editable: false,
    formatter: (cell) => {
      return cell.length;
    },
  },
];
