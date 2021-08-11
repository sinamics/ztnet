const isDev = process.env.NODE_ENV !== 'production';

module.exports = JSON.stringify({
  apiUrl: isDev ? 'http://localhost:4000' : process.env.REACT_APP_WEB_ADDRESS,
  wsUrl: isDev ? 'ws://localhost:4000' : `wss://${process.env.REACT_APP_WEB_ADDRESS}`,
  admin: 'ADMIN',
  roles: [
    {
      value: 'ADMIN',
      label: 'ADMIN',
    },
    {
      value: 'MODERATOR',
      label: 'MODERATOR',
    },
    {
      value: 'USER',
      label: 'USER',
    },
  ],
  licenseStatus: [
    {
      value: 'Expired',
      label: 'Expired',
    },
    {
      value: 'Active',
      label: 'Active',
    },
    {
      value: 'Sold',
      label: 'Sold',
    },
    {
      value: 'Redeemed',
      label: 'Redeemed',
    },
  ],
});
