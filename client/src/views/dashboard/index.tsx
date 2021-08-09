import { Typography } from '@material-ui/core';
import React from 'react';
import { Container, Row, Col } from 'reactstrap';
import { Grid, Step } from 'semantic-ui-react';
import './style.css';

const steps = [
  {
    key: 'addRaspberry',
    title: 'Connect your Raspberry Pi',
    description: 'Goto Network menu and follow the instructions',
    href: '/network',
  },
  {
    key: 'DownloadApp',
    title: 'Connect your GCS / PC',
    description: 'Install Zerotier on your PC / GCS \n https://www.zerotier.com/download/',
    href: 'https://www.zerotier.com/download/',
  },
  {
    key: 'Connect',
    completed: true,
    title: 'Start Streaming',
    description: 'Add your PC Zerotier IP address in UAVcast-Pro Ground Control Page',
  },
];

const Dashboard: React.FC<any> = (): JSX.Element => {
  return (
    <Container>
      <div>
        <Row className='mt-3 mb-3'>
          <Typography variant='h5' align='center'>
            Welcome to {process.env.REACT_APP_SITE_NAME}
          </Typography>
          <div className='text-center '>
            <p>
              This site is buildt on top of Zerotier VPN controller.
              <br />
            </p>
          </div>
        </Row>
        <Grid className='mt-3 mb-3'>
          <h4>Follow these steps to configure your VPN network</h4>
          <Grid.Column width={16}>
            <Step.Group size='big' widths={3} ordered items={steps} />
          </Grid.Column>
        </Grid>
        <Row className='mt-3 mb-3'>
          <Col md='12'>{/* col 2 */}</Col>
        </Row>
      </div>
    </Container>
  );
};

export default Dashboard;
