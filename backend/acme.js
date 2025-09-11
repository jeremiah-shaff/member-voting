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
  global.__acmeChallengeValue = null;

  const cert = await client.auto({
    csr,
    email: process.env.ACME_EMAIL,
    termsOfServiceAgreed: true,
    challengeCreateFn: async (authz, challenge, keyAuthorization) => {
      global.__acmeChallengeValue = keyAuthorization;
    },
    challengeRemoveFn: async () => {
      global.__acmeChallengeValue = null;
    }
  });
  fs.writeFileSync(path.join(CERT_DIR, 'privkey.pem'), key);
  fs.writeFileSync(path.join(CERT_DIR, 'cert.pem'), cert);
  return { key, cert };
}

module.exports = { getCertificate, CERT_DIR };
