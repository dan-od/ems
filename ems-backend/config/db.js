const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.DB_USER || 'ems_admin',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'ems',
  password: process.env.DB_PASSWORD || 'tested',
  port: process.env.DB_PORT || 5432,
});
module.exports = pool;