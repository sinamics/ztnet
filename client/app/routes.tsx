/* eslint-disable react-hooks/exhaustive-deps */
import React from 'react';

import { Switch, Route, Redirect, BrowserRouter as Router } from 'react-router-dom';

// Public Views
import PageNotFound from '../views/pageNotFound';
import PageLogin from '../views/login';
import FirstLoginChangePassword from 'client/views/login/firstLogin';
import Forgot from '../views/forgot';
import PageSignup from '../views/register';
import ValidateEmail from '../views/validateEmail';
import Resetpassword from '../views/resetPassword';
// import Forgot from '../views/home/forgot';
// Authorized views
import Dashboard from '../views/dashboard';

// AUTH
import { Admin } from '../views/admin';
import { Network, ViewNetworkById } from '../views/network';
import AdminRoute from '../common-components/auth/adminRoute';
import PrivateRoute from '../common-components/auth/PrivateRoute';
import { ProfileRoutes } from '../views/profile';
import { LayoutAnonymous, LayoutAuthenticated, LayoutPublic } from './layouts';

const anonymousRoutes = [
  {
    key: 'validatemail',
    path: '/validation/email/:token?',
    component: ValidateEmail,
    exact: true,
  },
  {
    key: 'notfound',
    path: '*',
    component: PageNotFound,
    exact: false, // important, Admin is just a new Router switch container
  },
];
const adminRoutes = [
  {
    key: 'admin',
    path: '/admin/:submenu?',
    component: Admin,
    exact: false, // important, Admin is just a new Router switch container
  },
];

const publicRoutes = [
  {
    key: 'homepage',
    path: '/',
    component: PageLogin, // Force to view login page
    exact: true,
  },
  {
    key: 'login',
    path: '/login/:session?',
    component: PageLogin,
    exact: true,
  },
  {
    key: 'register',
    path: '/register',
    component: PageSignup,
    exact: true,
  },
  {
    key: 'forgot',
    path: '/forgot',
    component: Forgot,
    exact: true,
  },
  {
    key: 'resetpassword',
    path: '/resetpassword/:token',
    component: Resetpassword,
    exact: true,
  },
];

const privateRoutes = [
  {
    key: 'dashboard',
    path: '/dashboard',
    component: Dashboard,
    exact: true,
  },
  {
    key: 'FirstLoginChangePassword',
    path: '/firstLoginChangePassword',
    component: FirstLoginChangePassword,
    exact: true,
  },
  {
    key: 'networks',
    path: '/network',
    component: Network,
    exact: true, // important, ProfileRoutes is just a new Router switch container
  },
  {
    key: 'viewnetworks',
    path: '/network/:nwid',
    component: ViewNetworkById, // sub routing is handled in that component
    exact: true, // important, ProfileRoutes is just a new Router switch container
  },
  {
    key: 'profile',
    path: '/profile/:submenu',
    component: ProfileRoutes,
    exact: true,
  },
];

const PublicRoute: React.FC<any> = (props) => {
  const { component: Component, ...restProps } = props;

  if (!Component) return null;
  // If we need to validate public routes, lets do it here.  Allowing all for now.
  let valid = true;
  return (
    <Route
      {...restProps}
      render={(routeRenderProps) =>
        valid ? (
          <Component {...routeRenderProps} />
        ) : (
          <Redirect
            to={{
              pathname: '/',
              state: { from: routeRenderProps.location },
            }}
          />
        )
      }
    />
  );
};

const Routes: React.FC = (): JSX.Element => {
  return (
    <Router>
      <Switch>
        <Route exact path={['/admin*']}>
          <LayoutAuthenticated>
            <Switch>
              {adminRoutes.map((adminRouteProps) => (
                <AdminRoute {...adminRouteProps} />
              ))}
            </Switch>
          </LayoutAuthenticated>
        </Route>

        <Route exact path={['/dashboard', '/network*', '/profile*', '/firstLoginChangePassword']}>
          <LayoutAuthenticated>
            <Switch>
              {privateRoutes.map((privateRouteProps) => (
                <PrivateRoute {...privateRouteProps} />
              ))}
            </Switch>
          </LayoutAuthenticated>
        </Route>

        {/* <Route exact path={['/', '/login*', '/register', '/forgot']}> */}
        <Route exact path={['/', '/login*', '/register', '/forgot', '/resetpassword*']}>
          <LayoutPublic>
            <Switch>
              {publicRoutes.map((publicRouteProps) => (
                <PublicRoute {...publicRouteProps} />
              ))}
            </Switch>
          </LayoutPublic>
        </Route>

        <Route path={['/validation*', '*']}>
          <LayoutAnonymous>
            <Switch>
              {anonymousRoutes.map((anonymousRoutes) => (
                <PublicRoute {...anonymousRoutes} />
              ))}
            </Switch>
          </LayoutAnonymous>
        </Route>
      </Switch>
    </Router>
  );
};

export default Routes;
