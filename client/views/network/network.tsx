import React from 'react';
import { Typography } from '@material-ui/core';
import { useCreateNetworkMutation, useZtnetworksQuery, ZtnetworksDocument } from 'client/graphql/generated/dist';
import NetworkTable from './containers/networkTable';
import { Container, Button, Grid, GridRow, Icon } from 'semantic-ui-react';

const Network: React.FC<any> = ({ history }): JSX.Element => {
  const { loading: loadingNetworks, error, data } = useZtnetworksQuery({
    fetchPolicy: 'network-only',
  });
  const [createNetwork] = useCreateNetworkMutation({
    refetchQueries: [{ query: ZtnetworksDocument }],
  });

  const addNewNetwork = () => {
    // New network
    createNetwork().catch((res) => console.error(res));
  };

  if (loadingNetworks) return <div className='text-center'>Loading...</div>;
  if (error) return <div className='text-center text-danger'>{error.message}</div>;

  const { allNetworks }: any = data;
  return (
    <Container>
      <GridRow className='mt-3 mb-3'>
        <Grid>
          <Grid.Column mobile={16} computer={16}>
            <Typography variant='h5' align='center'>
              Networks
            </Typography>
          </Grid.Column>
        </Grid>
      </GridRow>
      <GridRow className='mt-3 mb-3'>
        <Grid>
          <Grid.Column mobile={16} computer={5}>
            <div className='text-center'>
              <Button icon labelPosition='left' disabled={allNetworks && allNetworks.length > 3} color='teal' onClick={addNewNetwork}>
                <Icon name='plus' />
                Add Network
              </Button>
            </div>
          </Grid.Column>
          <Grid.Column mobile={16} computer={10}>
            <Typography variant='subtitle1' className='mb-3'>
              Connect team members from anywhere in the world on any device. ZeroTier creates secure networks between on-premise, cloud, desktop, and
              mobile devices. Zerotier It's an encrypted Peer-to-Peer technology, meaning that unlike traditional VPN solutions, communications don't
              need to pass through a central server or router — messages are sent directly from host to host.
            </Typography>
            <Typography variant='subtitle1' className='mb-3'></Typography>
            <div className='text-center'>
              {allNetworks && allNetworks.length > 0 && <NetworkTable tableData={allNetworks} history={history} />}
              {!allNetworks || (allNetworks.length === 0 && <div>No network found!</div>)}
            </div>
          </Grid.Column>
        </Grid>
      </GridRow>
    </Container>
  );
};

export default Network;
