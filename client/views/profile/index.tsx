import React from 'react';
import { Link, Switch, Route, Redirect } from 'react-router-dom';
import { Card, CardHeader } from 'reactstrap';
import Profile from './me';

import './style.css';

const ProfileRoutes = (props: any): any => {
  const { params } = props.match;
  //   const { loading, error, data: { getUsers } = {} } = useQuery(FETCH_ALL_USERS);

  //   const { loading: transLoading, data: { fetchAllTransponders } = {} } = useQuery(FETCH_ALL_TRANSPONDERS);

  //   if (loading || transLoading) return null;
  //   if (error) return `Error! ${error}`;

  return (
    <div>
      <Card className='menu_list_tabs' style={{ background: 'inherit' }}>
        <CardHeader style={{ border: 'none', borderRadius: 0 }} className='text-center menu_list_tabs__header'>
          <Link className='mr-4' to='/profile/me'>
            {params.submenu === 'me' ? <span style={{ color: 'white' }}>Me</span> : 'Me'}
          </Link>
          {/* <Link className='mr-4' to='/profile/subscription'>
            {params.submenu === 'subscription' ? <span style={{ color: 'white' }}>Subscription</span> : 'Subscription'}
          </Link> */}
        </CardHeader>
      </Card>

      <Switch>
        <Route exact path='/profile/me' component={() => <Profile />} />
        <Redirect from='/profile' to='/profile/me' />
      </Switch>
    </div>
  );
};

export default ProfileRoutes;
