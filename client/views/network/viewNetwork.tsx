import React, { useEffect, useRef, useState } from 'react';
import { Typography } from '@material-ui/core';
import { Button, Container, Divider, Grid, GridRow, Icon, Input, Label, Step } from 'semantic-ui-react';
import { NetworkDetailsDocument, useAddMemberMutation, useNetworkDetailsQuery, useUpdateNetworkMutation } from 'client/graphql/generated/dist';
import MembersTable from './components/memberTable';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import FileCopyOutlinedIcon from '@material-ui/icons/FileCopyOutlined';
import PrivacyCard from './components/privacyCard';
import { LoaderPlaceholder } from 'client/common-components/Loader/Placeholder';
import { map } from 'lodash';
import ZombiesTable from './components/zombiesTable';

const JoinSteps = [
  {
    key: 'copy',
    title: 'Copy the Network ID',
    description: 'This is your VPN ID',
  },
  {
    key: 'paste',
    title: 'Paste in UAVcast-Pro',
    description: 'Paste in Zerotier VPN section',
  },
  {
    key: 'confirm',
    completed: true,
    title: 'Your Raspberry will show up here!',
  },
];

const StreamSteps = [
  {
    key: 'JoinGCS',
    title: 'Well done!',
    description:
      'Download Zerotier application for your Pc or Tablet and join this network ID. When a device joins this network it will show up in the list bellow',
  },
  {
    key: 'pasteIP',
    title: 'Copy IP',
    description:
      'Tick the Auth box to allow the device on this network. Copy the IP assigned for the GCS, this is the destination for your telemetry and video',
  },
  {
    key: 'start',
    title: 'Paste in UAVcast-Pro',
    description:
      'Head over to UAVcast-Pro and Navigate to the ground control page and paste in the IP for your Pc / Tablet. Then enable the switch for video and telemetry.',
  },
  {
    key: 'firewall',
    title: 'GCS firewall',
    description:
      'Make sure your GCS pc has port 5600 and 14550 added to the firewall rules. Open Mission Planner or QGC and it will connect automatically.',
  },
];

const ViewNetwork = ({ match }: any) => {
  const [state, setState] = useState<any>({ copied: false, editName: false });
  const [viewDeletedMembers, setViewDeletedMembers] = useState<boolean>(false);
  const zombieTableRef = useRef<HTMLInputElement>(null);
  const [handler, setHandler] = useState<any>({ networkName: '', memberId: '', value: '' });

  const copyNwidIntercalCleanup = useRef<any>({});

  const { data: { networkDetails } = {}, loading: loadingNetwork, error: loadingNetworkError } = useNetworkDetailsQuery({
    variables: { nwid: match.params.nwid },
    fetchPolicy: 'network-only',
    pollInterval: 15000,
  });

  const [addMemberToDatabase] = useAddMemberMutation({
    refetchQueries: [{ query: NetworkDetailsDocument, variables: { nwid: match.params.nwid } }],
  });
  const [updateNetwork] = useUpdateNetworkMutation();

  useEffect(() => {
    return () => {
      clearTimeout(copyNwidIntercalCleanup.current);
    };
  }, []);

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
      {/* <Dimmer inverted active={loadingNetworkUpdates}>
        <Loader size='large'>Loading</Loader>
      </Dimmer> */}

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
                        updateNetworkHandler({ name: handler.networkName });
                      }
                    }}
                    onChange={handleChange}
                    name='networkName'
                    size='mini'
                    placeholder='network name'
                    value={handler.networkName || network.name}
                    // defaultValue={network.name}
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
          <Grid.Column mobile={8} computer={4}>
            <PrivacyCard
              onClick={() => updateNetworkHandler({ private: true })}
              faded={!network.private}
              title='Private'
              color='green'
              content='Each user needs to be Autorization by network administrator.'
            />
          </Grid.Column>
          <Grid.Column mobile={8} computer={4}>
            <PrivacyCard
              onClick={() => updateNetworkHandler({ private: false })}
              faded={network.private}
              title='Public'
              color='red'
              content='All users can connect to this network without Autorization'
            />
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
              {map(network.cidr, (cidr, idx) => {
                return cidr === network?.routes[0]?.target ? (
                  <span style={{ fontWeight: 'unset' }} key={idx} className='ml-1 mr-1 badge bg-success text-dark'>
                    {cidr}
                  </span>
                ) : (
                  <span
                    style={{ border: '1px dotted #a5a2a2', fontWeight: 'unset' }}
                    onClick={() => updateNetworkHandler({ changeCidr: cidr })}
                    key={idx}
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
        <Grid.Column width={3} floated='left'>
          {members && members.length ? (
            <div>
              <Typography variant='h5'>
                <div className='ui label'>Network Members</div>
              </Typography>
            </div>
          ) : (
            <Typography variant='h5'>
              <span className='ui label yellow'>No Members found!</span>
            </Typography>
          )}
        </Grid.Column>
        <Grid.Column floated='right' width={5}>
          <small className=''>Devices will show up automatically, no need to refresh!</small>
        </Grid.Column>
        <Grid.Column width={16}>
          {members.length ? (
            <>
              <Step.Group widths={4} ordered items={StreamSteps} />
              <MembersTable cidr={network?.routes[0]?.target} tableData={members} />
            </>
          ) : (
            <Step.Group widths={3} ordered items={JoinSteps} />
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

export default ViewNetwork;
