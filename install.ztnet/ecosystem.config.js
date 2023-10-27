module.exports = {
  apps: [
    {
      name: 'ztnet_installer',
      script: './dist/index.js',
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
