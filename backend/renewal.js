// Auto-renewal scheduler for ACME certificates
const { getCertificate } = require('./acme');
const { getFqdnFromDb } = require('./db');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const CERT_DIR = process.env.CERT_DIR || path.join(__dirname, 'certs');
const certPath = path.join(CERT_DIR, 'cert.pem');

function getCertExpiry() {
  try {
    const cert = fs.readFileSync(certPath);
    const match = cert.toString().match(/Not After : (.*)/);
    if (match) return new Date(match[1]);
  } catch {}
  return null;
}

async function renewIfNeeded() {
  if (!fs.existsSync(certPath)) {
    console.log('No certificate file found at', certPath, '- skipping renewal.');
    return;
  }
  const expiry = getCertExpiry();
  const fqdn = await getFqdnFromDb();
  if (!expiry || (expiry - Date.now()) < 1000 * 60 * 60 * 24 * 14) { // <14 days
    console.log('Renewing certificate for FQDN:', fqdn);
    await getCertificate(fqdn);
    process.exit(0); // Restart to reload cert
  } else {
    console.log('Certificate is valid, no renewal needed.');
  }
}

// Schedule renewal every day at 2am
const schedule = require('node-cron');
schedule.schedule('0 2 * * *', async () => {
  await renewIfNeeded();
});

// Run once on startup
renewIfNeeded();
