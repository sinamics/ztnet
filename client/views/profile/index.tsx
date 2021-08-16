import React from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';
import { Grid, Menu } from 'semantic-ui-react';
import Profile from './me';

const ProfileRoutes = (props: any): any => {
  const { match, history } = props;
  return (
    <Grid padded>
      <Grid.Row centered>
        <Grid.Column width={16} textAlign='center'>
          <Menu compact pointing secondary className='lightdarktheme'>
            <Menu.Item name='ME' onClick={() => history.push('/profile/me')} active={match.params.submenu === 'me'} />
          </Menu>
        </Grid.Column>
      </Grid.Row>
      <Grid.Row centered>
        <Grid.Column width={14}>
          <Switch>
            <Route exact path='/profile/me' component={() => <Profile />} />
            <Route exact path='/admin/controller' component={() => <Profile {...props} />} />
            <Redirect from='/profile' to='/profile/me' />
          </Switch>
        </Grid.Column>
      </Grid.Row>
    </Grid>
  );
};

export default ProfileRoutes;
