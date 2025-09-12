require('dotenv').config();

const fs = require('fs');
const https = require('https');
const { getCertificate, CERT_DIR } = require('./acme');

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Attach pool to request for route handlers
app.use((req, res, next) => {
  req.pool = pool;
  next();
});

// Serve uploads directory for branding images
app.use('/uploads', express.static(require('path').join(__dirname, 'uploads')));

// API routes
const routes = require('./routes');
app.use('/api', routes);

app.get('/', (req, res) => {
  res.send('Member Voting API is running');
});

// Endpoint to request/renew ACME certificate
app.post('/api/request-certificate', async (req, res) => {
  const fqdn = req.body.fqdn || process.env.FQDN;
  if (!fqdn) return res.status(400).json({ error: 'FQDN required' });
  try {
    const { key, cert } = await getCertificate(fqdn);
    res.json({ success: true });
    process.exit(0); // Restart to reload cert
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4000;
const FQDN = process.env.FQDN;
const keyPath = CERT_DIR + '/privkey.pem';
const certPath = CERT_DIR + '/cert.pem';
if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  const key = fs.readFileSync(keyPath);
  const cert = fs.readFileSync(certPath);
}
app.listen(PORT, () => {
  console.log(`HTTP server running on port ${PORT}`);
  // Start auto-renewal scheduler
  require('./renewal');
});
