/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import ReactGA from "react-ga4";
import Routes from './routes';
// AUTH
import { setAccessToken } from 'client/utils/accessToken';

// @ts-ignore
import config from 'config';
import { withRouter } from 'react-router';

ReactGA.initialize("G-X16M3DW3G6");

const App: React.FC = ({location}:any): JSX.Element => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ReactGA.send({ hitType: "pageview", page: location.pathname });
    // Open sidebar on pageload
    document.body.classList.remove('sidebar-minimized');
    document.body.classList.remove('brand-minimized');

    // Fetch refresh token on pageload
    fetch(`${config.apiUrl}/refresh_token`, {
      method: 'POST',
      credentials: 'include',
    }).then(async (x: { json: () => PromiseLike<{ accessToken: any }> | { accessToken: any } }) => {
      const { accessToken } = await x.json();
      setAccessToken(accessToken);
      setLoading(false);
    });
  }, []);

  if (loading) return <div></div>;

  return <Routes />;
};

export default withRouter(App);
