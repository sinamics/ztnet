/* eslint-disable react-hooks/exhaustive-deps */
import React from 'react';
import { Redirect, withRouter } from 'react-router-dom';
import { useMeQuery } from 'client/graphql/generated/dist';
import HomeHeader from '../common-components/header/public';
import Header from '../common-components/header/auth';
import Sidebar from '../common-components/sidebar/sidebar';

export const LayoutPublic: React.FC<any> = (props: any) => {
  const { loading, data: { me = null } = {} }: any = useMeQuery({ fetchPolicy: 'network-only' });
  if (loading) return <div>Loading...</div>;

  // If a valid refresh token is present, the ME oject is available, hence rute the user directly to Dashboard.
  if (me)
    return (
      <Redirect
        to={{
          pathname: '/dashboard',
        }}
      />
    );
  return (
    <>
      <HomeHeader pathname={props.pathname} />
      <div className='homepage'>{props.children}</div>
    </>
  );
};

export const LayoutAuthenticated = withRouter(({ children }: any): any => {
  return (
    <div className='app'>
      <Header />
      <div className='app-body'>
        <Sidebar />
        <main className='main'>{children}</main>
      </div>
    </div>
  );
});
export const LayoutAnonymous: React.FC<{}> = (props) => {
  return <div>{props.children}</div>;
};
