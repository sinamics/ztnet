/* eslint-disable no-underscore-dangle */
import * as React from 'react';
import { Route, Redirect } from 'react-router-dom';

// @ts-ignore
// import config from 'config';
import { useMeQuery } from 'src/graphql/generated/dist';

interface props {
  component: React.ElementType;
}

const PrivateRoute: React.FC<{ component: React.FC<props>; path: string; exact: boolean }> = (props): JSX.Element => {
  const { loading, error, data: { me } = { me: null } } = useMeQuery({
    nextFetchPolicy: 'network-only',
  });

  if (loading) return <div>Loading User privileges</div>;
  if (error) return <Redirect to={{ pathname: '/login' }} />;

  const Component: any = props.component;

  return me ? <Route path={props.path} exact={props.exact} render={(props) => <Component {...props} me={me} />} /> : <Redirect to='/login' />;
};
export default PrivateRoute;
