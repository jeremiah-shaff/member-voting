// ACME certificate management for Let's Encrypt
const fs = require('fs');
const path = require('path');
const acme = require('acme-client');
require('dotenv').config();

const CERT_DIR = path.join(__dirname, 'certs');
if (!fs.existsSync(CERT_DIR)) fs.mkdirSync(CERT_DIR);

global.__acmeChallengeMap = global.__acmeChallengeMap || {};

async function getCertificate(fqdn) {
  const accountKey = await acme.crypto.createPrivateRsaKey();
  const client = new acme.Client({
    directoryUrl: acme.directory.letsencrypt.production,
    accountKey
  });

  const [key, csr] = await acme.crypto.createCsr({ commonName: fqdn });

  const cert = await client.auto({
    csr,
    email: process.env.ACME_EMAIL,
    termsOfServiceAgreed: true,
    challengeCreateFn: async (authz, challenge, keyAuthorization) => {
      if (challenge && challenge.token) {
        global.__acmeChallengeMap[challenge.token] = keyAuthorization;
        // Write challenge to file for Nginx
        const challengeDir = path.join(__dirname, '../frontend/public/.well-known/acme-challenge');
        if (!fs.existsSync(challengeDir)) fs.mkdirSync(challengeDir, { recursive: true });
        fs.writeFileSync(path.join(challengeDir, challenge.token), keyAuthorization, { encoding: 'utf8' });
      }
    },
    challengeRemoveFn: async (authz, challenge) => {
      if (challenge && challenge.token) {
        delete global.__acmeChallengeMap[challenge.token];
        // Remove challenge file
        const challengeDir = path.join(__dirname, '../frontend/public/.well-known/acme-challenge');
        const filePath = path.join(challengeDir, challenge.token);
        // if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    }
  });

  fs.writeFileSync(path.join(CERT_DIR, 'privkey.pem'), key);
  fs.writeFileSync(path.join(CERT_DIR, 'cert.pem'), cert);
  return { key, cert };
}

module.exports = { getCertificate, CERT_DIR };
