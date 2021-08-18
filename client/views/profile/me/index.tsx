import React from 'react';

import { Container, Segment, Grid } from 'semantic-ui-react';
import { useMeQuery } from 'client/graphql/generated/dist';

const Profile = () => {
  const { data: { me = {} } = {}, loading: meLoading } = useMeQuery({
    fetchPolicy: 'network-only',
  });

  if (meLoading) return <div>Loading Profile...</div>;

  return (
    <Container className='mt-4'>
      <Grid columns={16} divided>
        <Grid.Row>
          <Grid.Column width={8}>
            <Segment>
              <h5>Me</h5>
              <div className='d-flex justify-content-between'>
                <div className='text-muted'>Name</div>
                <div>{me?.firstname}</div>
              </div>
              <div className='d-flex justify-content-between'>
                <div className='text-muted'>Lastname</div>
                <div>{me?.lastname}</div>
              </div>

              <div className='d-flex justify-content-between'>
                <div className='text-muted'>Email</div>
                <div>{me?.email}</div>
              </div>
            </Segment>
          </Grid.Column>
          <Grid.Column width={8}>
            <Segment>
              <h5>License Information</h5>
              <div className='d-flex justify-content-between'>
                <div className='text-muted'>OrderId</div>
                <div>{me?.orderId}</div>
              </div>
              <div className='d-flex justify-content-between'>
                <div className='text-muted'>License Key</div>
                <div>{me?.licenseKey}</div>
              </div>

              <div className='d-flex justify-content-between'>
                <div className='text-muted'>License Status</div>
                <div>{me?.licenseStatus}</div>
              </div>
              <div className='d-flex justify-content-between'>
                <div className='text-muted'>License Expire</div>
                <div>{me?.expirationDate}</div>
              </div>
            </Segment>
          </Grid.Column>
        </Grid.Row>
      </Grid>
    </Container>
  );
};

export default Profile;
