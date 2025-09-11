// ACME certificate management for Let's Encrypt
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const acme = require('acme-client');
require('dotenv').config();

const CERT_DIR = path.join(__dirname, 'certs');
if (!fs.existsSync(CERT_DIR)) fs.mkdirSync(CERT_DIR);

async function getCertificate(fqdn) {
  const accountKey = await acme.crypto.createPrivateRsaKey();
  const client = new acme.Client({
    directoryUrl: acme.directory.letsencrypt.production,
    accountKey
  });

  // Create domain private key and CSR
  const [key, csr] = await acme.crypto.createCsr({
    commonName: fqdn
  });

  // HTTP-01 challenge
  if (!global.__acmeChallengeMap) global.__acmeChallengeMap = {};

  const cert = await client.auto({
    csr,
    email: process.env.ACME_EMAIL,
    termsOfServiceAgreed: true,
    challengeCreateFn: async (authz, challenge, keyAuthorization) => {
      // Store challenge value per token
      if (challenge && challenge.token) {
        global.__acmeChallengeMap[challenge.token] = keyAuthorization;
        console.log(`[ACME] Challenge created for token: ${challenge.token}`);
      }
    },
    challengeRemoveFn: async (authz, challenge) => {
      // Remove challenge value for token
      if (challenge && challenge.token) {
        delete global.__acmeChallengeMap[challenge.token];
        console.log(`[ACME] Challenge removed for token: ${challenge.token}`);
      }
    }
  });
  fs.writeFileSync(path.join(CERT_DIR, 'privkey.pem'), key);
  fs.writeFileSync(path.join(CERT_DIR, 'cert.pem'), cert);
  return { key, cert };
}

module.exports = { getCertificate, CERT_DIR };
