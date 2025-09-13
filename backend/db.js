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

async function getRegistrationEnabled() {
  const result = await pool.query('SELECT value FROM settings WHERE key = $1', ['registrationEnabled']);
  return result.rows[0] ? result.rows[0].value === 'true' : true;
}

async function setRegistrationEnabled(enabled) {
  await pool.query('UPDATE settings SET value = $1 WHERE key = $2', [enabled ? 'true' : 'false', 'registrationEnabled']);
}

module.exports = {
  getFqdnFromDb,
  setRegistrationEnabled,
  getRegistrationEnabled,
};
