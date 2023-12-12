module.exports = {
  apps: [
    {
      name: 'ztnet.network',
      script: 'npm run serve -- --dir ~/ztnet_docs/build --port 3000 --host 0.0.0.0',
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
