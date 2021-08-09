module.exports = {
  apps: [
    {
      name: 'uavnet',
      script: 'ts-node',
      args: './server/index.ts',
      watch: true,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
