const { Client } = require('pg');

const client = new Client({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT,
});

client
  .connect()
  .then(() => console.log('Connected Postgres successfully!'))
  .catch((err: any) => console.log('Error connecting Postgres!', err));

module.exports = client;
