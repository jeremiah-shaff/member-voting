// ACME certificate management for Let's Encrypt
const fs = require('fs');
const path = require('path');
const acme = require('acme-client');
require('dotenv').config();

const CERT_DIR = path.join(__dirname, 'certs');
function ensureCertDir() {
  try {
    fs.mkdirSync(CERT_DIR, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') {
      console.error(`[ACME] Failed to create certs directory: ${CERT_DIR}`);
      throw err;
    }
  }
}

global.__acmeChallengeMap = global.__acmeChallengeMap || {};

async function getCertificate(fqdn) {
  const accountKey = await acme.crypto.createPrivateRsaKey();
  const client = new acme.Client({
    directoryUrl: acme.directory.letsencrypt.production,
    accountKey
  });
  ensureCertDir();

  const [key, csr] = await acme.crypto.createCsr({ commonName: fqdn });

  const cert = await client.auto({
    csr,
    email: process.env.ACME_EMAIL,
    termsOfServiceAgreed: true,
    challengeCreateFn: async (authz, challenge, keyAuthorization) => {
      if (challenge && challenge.token) {
        global.__acmeChallengeMap[challenge.token] = keyAuthorization;
      }
    },
    challengeRemoveFn: async (authz, challenge) => {
      if (challenge && challenge.token) {
        delete global.__acmeChallengeMap[challenge.token];
      }
    }
  });

  try {
    fs.writeFileSync(path.join(CERT_DIR, 'privkey.pem'), key);
    fs.writeFileSync(path.join(CERT_DIR, 'cert.pem'), cert);
  } catch (err) {
    console.error(`[ACME] Failed to write certificate files to ${CERT_DIR}`);
    throw err;
  }
  return { key, cert };
}

module.exports = { getCertificate, CERT_DIR };
