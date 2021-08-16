import React, { useEffect, useRef, useState } from 'react';
import { Typography } from '@material-ui/core';
import { Button, Card, Container, Divider, Grid, GridRow, Icon, Input, Label, Message } from 'semantic-ui-react';
import {
  MemberInformationDocument,
  NetworkDetailsDocument,
  useAddMemberMutation,
  useMeQuery,
  useNetworkDetailsQuery,
  useUpdateNetworkMutation,
} from 'client/graphql/generated/dist';
import MembersTable from './containers/memberTable';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import FileCopyOutlinedIcon from '@material-ui/icons/FileCopyOutlined';
import PrivatePublic from './components/privatePublic';
import { LoaderPlaceholder } from 'client/common-components/Loader/Placeholder';
import { map } from 'lodash';
import ZombiesTable from './containers/zombieTable';

const ViewNetworkById = ({ match }: any) => {
  const [state, setState] = useState<any>({ copied: false, editName: false });
  const [editing, setEditing] = useState<boolean>(false);
  const [viewDeletedMembers, setViewDeletedMembers] = useState<boolean>(false);
  const zombieTableRef = useRef<HTMLInputElement>(null);
  const [handler, setHandler] = useState<any>({ networkName: '', memberId: '', value: '' });

  const copyNwidIntercalCleanup = useRef<any>({});

  const {
    data: { networkDetails } = {},
    loading: loadingNetwork,
    error: loadingNetworkError,
    subscribeToMore: memberInformationListner,
  } = useNetworkDetailsQuery({
    variables: { nwid: match.params.nwid },
  });

  const { data: { me = {} } = {} } = useMeQuery({
    fetchPolicy: 'network-only',
  });

  const [addMemberToDatabase] = useAddMemberMutation({
    refetchQueries: [{ query: NetworkDetailsDocument, variables: { nwid: match.params.nwid } }],
  });
  const [updateNetwork] = useUpdateNetworkMutation();

  useEffect(() => {
    let unsubscribe: any;

    // cancle subscription if user is editing the members table.
    if (!editing) {
      // Listen for application updates and update Cache.
      unsubscribe = memberInformationListner({
        document: MemberInformationDocument,
        variables: { nwid: match.params.nwid, userid: me?.userid },
        updateQuery: (prev, { subscriptionData }): any => {
          if (!subscriptionData.data) return prev;
          //@ts-ignore
          const newFeedData = subscriptionData.data?.memberInformation;
          return Object.assign({}, prev, {
            networkDetails: { ...prev.networkDetails, members: newFeedData.members },
          });
        },
      });
    }
    if (unsubscribe) return () => unsubscribe();
    return () => {
      clearTimeout(copyNwidIntercalCleanup.current);
    };
  }, [memberInformationListner, match, me, editing]);

  const copyClipboard = () => {
    setState({ copied: true });
    copyNwidIntercalCleanup.current = setTimeout(() => {
      setState({ copied: false });
    }, 2000);
  };
  const updateNetworkHandler = (data: any) => {
    setState((prev: any) => ({ ...prev, editName: false }));
    updateNetwork({
      variables: { nwid: network.nwid, data },
    });
  };

  const handleChange = (e: any) => {
    setHandler((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const addMember = (nwid: string) => {
    addMemberToDatabase({
      variables: { nwid, memberId: handler.memberId },
    }).then(() => setHandler((prev: any) => ({ ...prev, memberId: '' })));
  };

  if (loadingNetworkError) return <div className='container text-danger text-center'>{loadingNetworkError.message}</div>;

  if (loadingNetwork) {
    return (
      <Container>
        <GridRow className='mt-3 mb-3'>
          <LoaderPlaceholder row={6} lines={5} fluid />
        </GridRow>
      </Container>
    );
  }

  const { network, members, zombieMembers }: any = networkDetails;
  return (
    <Container>
      <GridRow className='mt-3 mb-3'>
        <Grid>
          <Grid.Column mobile={16} computer={8}>
            <Typography variant='h6'>
              <span className='text-muted'>Network ID:</span> {network.nwid}
              {!state.copied ? (
                <CopyToClipboard text={network.nwid} onCopy={() => copyClipboard()}>
                  <span style={{ cursor: 'pointer', paddingLeft: 10, color: 'rgb(253 106 1)' }}>
                    <FileCopyOutlinedIcon titleAccess='Copy network ID' />
                  </span>
                </CopyToClipboard>
              ) : (
                <span style={{ cursor: 'pointer', fontSize: '14px', paddingLeft: 10, color: 'green' }}>Copied!</span>
              )}
              <div>
                <span className='text-muted'>Network Name:</span>
                {state.editName ? (
                  <Input
                    onKeyPress={(e: any) => {
                      if (e.key === 'Enter') {
                        updateNetworkHandler({ name: handler.networkName || network.name });
                      }
                    }}
                    onChange={handleChange}
                    name='networkName'
                    size='mini'
                    placeholder='network name'
                    defaultValue={network.name}
                  />
                ) : (
                  <span style={{ cursor: 'pointer' }} onClick={() => setState({ editName: true })} className='ml-1'>
                    {network.name} <Icon style={{ color: 'rgb(253 106 1)' }} name='edit outline' size='small' className='ml-3' />
                  </span>
                )}
              </div>
              <div>
                <span className='text-muted'>Network is </span>{' '}
                {network.private ? <span className='text-success'>Private</span> : <span className='text-danger'>Public</span>}
              </div>
            </Typography>
          </Grid.Column>
          <Grid.Column mobile={16} computer={8}>
            <Card.Group itemsPerRow={2}>
              <PrivatePublic
                onClick={() => updateNetworkHandler({ private: true })}
                faded={!network.private}
                title='Private'
                color='green'
                content='Each user needs to be Autorization by network administrator.'
              />
              <PrivatePublic
                onClick={() => updateNetworkHandler({ private: false })}
                faded={network.private}
                title='Public'
                color='red'
                content='All users can connect to this network without Autorization'
              />
            </Card.Group>
          </Grid.Column>
        </Grid>
      </GridRow>

      <GridRow>
        <Grid className=''>
          <Grid.Column mobile={12} computer={16} floated='left'>
            <div>
              <span className='text-muted'>Network Start:</span> {network && network.ipAssignmentPools[0]?.ipRangeStart}
              <span className='text-muted ml-5'>Network End:</span> {network && network.ipAssignmentPools[0]?.ipRangeEnd}
              <span className='text-muted ml-5'>Network Cidr:</span> {network && network.routes[0]?.target}
            </div>
          </Grid.Column>
          <Grid.Column mobile={16} computer={8}>
            <div className=''>
              IPv4 Assignments <small>(Do not change unless you have to)</small>
            </div>
            <div style={{ cursor: 'pointer', fontSize: '24px', color: '#636363' }}>
              {map(network.cidr, (cidr) => {
                return cidr === network?.routes[0]?.target ? (
                  <span style={{ fontWeight: 'unset' }} key={cidr} className='ml-1 mr-1 badge bg-success text-dark'>
                    {cidr}
                  </span>
                ) : (
                  <span
                    style={{ border: '1px dotted #a5a2a2', fontWeight: 'unset' }}
                    onClick={() => updateNetworkHandler({ changeCidr: cidr })}
                    key={cidr}
                    className='ml-1 mr-1 badge bg-light text-dark'
                  >
                    {cidr}
                  </span>
                );
              })}
            </div>
          </Grid.Column>
        </Grid>
      </GridRow>
      <GridRow>
        <Divider className='mt-5' horizontal>
          Network Members
        </Divider>
      </GridRow>
      <Grid className='mb-3'>
        <Grid.Column floated='right' width={5}>
          <Typography variant='h5'>
            <div className='ui label'>Devices will show up automatically, no need to refresh!</div>
          </Typography>
        </Grid.Column>
        <Grid.Column width={16}>
          {members.length ? (
            <MembersTable cidr={network?.routes[0]?.target} tableData={members} setEditing={(e: boolean) => setEditing(e)} />
          ) : (
            <Message
              color='yellow'
              icon='user'
              header='No members found!'
              content='Join this network ID and the device will automatically be displayed in this table'
            />
          )}
        </Grid.Column>
      </Grid>
      <GridRow className='mt-4 mb-3'>
        <Grid.Column width={3}>
          <Input
            action={{
              color: 'teal',
              labelPosition: 'left',
              icon: 'add',
              content: 'Add member manually',
              onClick: () => addMember(network.nwid),
            }}
            value={handler.memberId}
            onChange={handleChange}
            actionPosition='left'
            placeholder='Device ID'
            name='memberId'
          />
          <div>
            <Label pointing>
              Adds a node to this network before it joins.
              <br /> Can be used to undelete a member.
            </Label>
          </div>
        </Grid.Column>
        {zombieMembers.length ? (
          <>
            <Grid.Column width={3} className='mt-5'>
              <Button
                icon
                labelPosition='left'
                color='teal'
                onClick={() => {
                  setViewDeletedMembers(!viewDeletedMembers);
                  setTimeout(() => {
                    zombieTableRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }, 10);
                }}
              >
                <Icon name='user cancel' />
                View deleted members ({zombieMembers.length})
              </Button>
            </Grid.Column>

            <div ref={zombieTableRef}>
              {viewDeletedMembers ? (
                <Grid.Column width={16} className='mt-5'>
                  <>
                    <small>These members are zombies (deleted) and will be removed from the vpn controller after a while</small>
                    <br />
                    <small>You can still re-active them if you wish.</small>
                    <ZombiesTable cidr={network?.routes[0]?.target} tableData={zombieMembers} />
                  </>
                </Grid.Column>
              ) : null}
            </div>
          </>
        ) : null}
      </GridRow>
    </Container>
  );
};

export default ViewNetworkById;
