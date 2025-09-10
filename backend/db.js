// Simple DB utility for renewal.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function getFqdnFromDb() {
  const result = await pool.query('SELECT fqdn FROM branding ORDER BY id DESC LIMIT 1');
  return result.rows[0]?.fqdn || process.env.FQDN;
}

module.exports = { getFqdnFromDb };
