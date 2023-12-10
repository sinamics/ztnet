module.exports = {
  apps: [
    {
      name: 'ztnet.network',
      script: './start.sh',
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
