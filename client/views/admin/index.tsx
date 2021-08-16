//@ts-nocheck
import React from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';
import Users from './pages/users';
import Controller from './pages/controller';
import Settings from './pages/settings';
import { Grid, Menu } from 'semantic-ui-react';

const Index: React.FC<any> = (props): JSX.Element => {
  const { match, history } = props;

  return (
    <Grid padded>
      <Grid.Row centered>
        <Grid.Column width={16} textAlign='center'>
          <Menu compact pointing secondary className='lightdarktheme'>
            <Menu.Item name='USERS' onClick={() => history.push('/admin/users')} active={match.params.submenu === 'users'} />
            <Menu.Item name='CONTROLLER' onClick={() => history.push('/admin/controller')} active={match.params.submenu === 'controller'} />
            <Menu.Item name='SETTINGS' onClick={() => history.push('/admin/settings')} active={match.params.submenu === 'settings'} />
          </Menu>
        </Grid.Column>
      </Grid.Row>
      <Grid.Row centered>
        <Grid.Column width={14}>
          <Switch>
            <Route exact path='/admin/users' component={() => <Users />} />
            <Route exact path='/admin/controller' component={() => <Controller {...props} />} />
            <Route exact path='/admin/settings' component={() => <Settings />} />
            <Redirect from='/admin' to='/admin/users' />
          </Switch>
        </Grid.Column>
      </Grid.Row>
    </Grid>
  );
};

export default Index;
