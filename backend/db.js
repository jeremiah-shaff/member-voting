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
  const row = await db.get('SELECT value FROM settings WHERE key = ?', ['registrationEnabled']);
  return row ? row.value === 'true' : true;
}

async function setRegistrationEnabled(enabled) {
  await db.run('UPDATE settings SET value = ? WHERE key = ?', [enabled ? 'true' : 'false', 'registrationEnabled']);
}

module.exports = {
  getFqdnFromDb,
  setRegistrationEnabled,
  getRegistrationEnabled,
};
