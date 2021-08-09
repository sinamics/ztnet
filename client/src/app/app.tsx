/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import Routes from './routes';
// AUTH
import { setAccessToken } from 'src/utils/accessToken';
import './style.css';

// @ts-ignore
import config from 'config';

const App: React.FC = (): JSX.Element => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

export default App;
