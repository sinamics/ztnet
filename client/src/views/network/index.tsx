import React from 'react';
import { Typography } from '@material-ui/core';
import { useCreateNetworkMutation, useZtnetworksQuery, ZtnetworksDocument } from 'src/graphql/generated/dist';
import { Container, Row, Col } from 'reactstrap';
import NetworkTable from './components/networksTable';
import './style.css';
import { Button, Icon } from 'semantic-ui-react';

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
      <div>
        <Row className='mt-3 mb-3'>
          <Typography variant='h5' align='center'>
            Networks
          </Typography>
        </Row>
        <Row className='mt-3 mb-3'>
          <Col md='4'>
            {/* <p>Only 5 networks is allowed</p> */}
            <div className='text-center'>
              <Button icon labelPosition='left' disabled={allNetworks && allNetworks.length > 3} color='teal' onClick={addNewNetwork}>
                <Icon name='plus' />
                Add Network
              </Button>
            </div>
          </Col>
          <Col md='6'>
            <Typography variant='subtitle1' className='mb-3'>
              A VPN network is like a room of devices. All members in a room can talk with each other. When your Raspberry PI and GCS PC is connected
              to the same network, you can start sharing data like telemetry and video. Typically you want to have one network for each Raspberry PI
            </Typography>
            <Typography variant='subtitle1' className='mb-3'></Typography>
            {/* <Typography variant='h5'>Click a network</Typography> */}
            <div className='text-center'>
              {allNetworks && allNetworks.length > 0 && <NetworkTable tableData={allNetworks} history={history} />}
              {!allNetworks || (allNetworks.length === 0 && <div>No network found!</div>)}
            </div>
          </Col>
          <Col md='2'>
            <div className='text-center'></div>
          </Col>
        </Row>
        <Row className='mt-3 mb-3'>
          <Col md='12'>{/* col 2 */}</Col>
        </Row>
      </div>
    </Container>
  );
};

export default Network;
