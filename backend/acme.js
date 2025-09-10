// ACME certificate management for Let's Encrypt
const fs = require('fs');
const path = require('path');
const express = require('express');
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
  let challengeValue;
  const app = express();
  app.get('/.well-known/acme-challenge/:token', (req, res) => {
    if (req.params.token && challengeValue) {
      res.send(challengeValue);
    } else {
      res.status(404).end();
    }
  });

  // Start temporary challenge server
  const challengeServer = app.listen(80);

  try {
    const cert = await client.auto({
      csr,
      email: process.env.ACME_EMAIL,
      termsOfServiceAgreed: true,
      challengeCreateFn: async (authz, challenge, keyAuthorization) => {
        challengeValue = keyAuthorization;
      },
      challengeRemoveFn: async () => {
        challengeValue = null;
      }
    });
    fs.writeFileSync(path.join(CERT_DIR, 'privkey.pem'), key);
    fs.writeFileSync(path.join(CERT_DIR, 'cert.pem'), cert);
    return { key, cert };
  } finally {
    challengeServer.close();
  }
}

module.exports = { getCertificate, CERT_DIR };
