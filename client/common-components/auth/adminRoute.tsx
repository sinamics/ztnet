/* eslint-disable no-underscore-dangle */
import * as React from 'react';
import { Route, Redirect } from 'react-router-dom';

// @ts-ignore
import config from 'config';
import { useAdminQuery } from 'client/graphql/generated/dist';

interface props {
  component: React.ElementType;
  path: string;
}

const AdminRoute: React.FC<{ component: React.FC<props>; path: string; exact: boolean }> = (props): JSX.Element => {
  const { loading, error, data: { admin } = {} } = useAdminQuery();

  if (loading) return <div>Loading Admin privileges</div>;

  if (!admin) return <Redirect to={{ pathname: '/dashboard' }} />;
  if (error) return <div>`${error}`</div>;

  let administrator = !!admin?.role?.includes(config.admin);
  const Component: any = props.component;

  return administrator ? (
    <Route path={props.path} exact={props.exact} render={(props) => <Component {...props} admin={admin} />} />
  ) : (
    <Redirect to='/dashboard' />
  );
};
export default AdminRoute;
