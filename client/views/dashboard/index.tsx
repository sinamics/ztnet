//@ts-nocheck
import { Typography } from '@material-ui/core';
import React from 'react';
import { Container, Grid, GridRow, Step } from 'semantic-ui-react';

const Dashboard: React.FC<any> = (): JSX.Element => {
  return (
    <Container>
      <GridRow className='mt-3 mb-3'>
        <Grid>
          <Grid.Column mobile={16} computer={16}>
            <Typography variant='h5' align='center'>
              Welcome to {process.env.REACT_APP_SITE_NAME}
            </Typography>
            <div className='text-center '>
              <p>
                This site is buildt on top of Zerotier VPN controller.
                <br />
              </p>
            </div>
          </Grid.Column>
          <Grid.Column mobile={16} computer={16}>
            <Typography variant='h5' align='center'>
              Connect team members from anywhere in the world on any device. ZeroTier creates secure networks between on-premise, cloud, desktop, and
              mobile devices.
            </Typography>
          </Grid.Column>

          <Grid.Column mobile={16} computer={16} textAlign='center'>
            <p>
              Checkout our tutorial using UAVnet
              <br />
            </p>
            <iframe
              width='560'
              height='315'
              src='https://www.youtube.com/embed/mcJ2LyNYyzE'
              title='YouTube video player'
              frameBorder='0'
              allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
              allowFullScreen
            ></iframe>
          </Grid.Column>
        </Grid>
      </GridRow>
    </Container>
  );
};

export default Dashboard;
