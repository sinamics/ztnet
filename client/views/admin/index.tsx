import React from 'react';
import { Link, Switch, Route, Redirect } from 'react-router-dom';
import { Card, CardHeader, CardBody } from 'reactstrap';
import Users from './pages/users';
import Controller from './pages/controller';
import Settings from './pages/settings';
import './style.css';

const Index: React.FC<any> = (props): JSX.Element => {
  const { params } = props.match;

  return (
    <div>
      <Card className='menu_list_tabs'>
        <CardHeader style={{ border: 'none', borderRadius: 0 }} className='text-center menu_list_tabs__header'>
          <Link className='mr-4' to='/admin/users'>
            {params.submenu === 'users' ? <span style={{ color: 'white' }}>USERS</span> : 'USERS'}
          </Link>
          <Link className='mr-4' to='/admin/controller'>
            {params.submenu === 'users' ? <span style={{ color: 'white' }}>CONTROLLER</span> : 'CONTROLLER'}
          </Link>
          <Link className='mr-4' to='/admin/settings'>
            {params.submenu === 'users' ? <span style={{ color: 'white' }}>SETTINGS</span> : 'SETTINGS'}
          </Link>
        </CardHeader>
        <CardBody>
          <Switch>
            <Route exact path='/admin/users' component={() => <Users />} />
            <Route exact path='/admin/controller' component={() => <Controller {...props} />} />
            <Route exact path='/admin/settings' component={() => <Settings />} />

            <Redirect from='/admin' to='/admin/users' />
          </Switch>
        </CardBody>
      </Card>
    </div>
  );
};

export default Index;
