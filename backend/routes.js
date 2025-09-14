// Endpoint to check certificate expiration

const path = require('path');
const { exec } = require('child_process');
const express = require('express');
const fs = require('fs');
const LOG_PATH = process.env.REQUEST_LOG_PATH || './request.log';
const router = express.Router();
const CERT_DIR = path.join(__dirname, 'certs');
const CERT_FILE = path.join(CERT_DIR, 'cert.pem');
const { X509Certificate } = require('crypto');
const { setRegistrationEnabled, getRegistrationEnabled } = require('./db');
const { DateTime } = require('luxon');

// Auth routes

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const upload = multer({ dest: path.join(__dirname, 'uploads/') });

const { authenticateToken, requireAdmin } = require('./middleware');
const { getCertificate } = require('./acme');
// ACME HTTP-01 challenge route
router.get('/.well-known/acme-challenge/:token', (req, res) => {
  const token = req.params.token;
  const challengeValue = global.__acmeChallengeMap[token];
  if (challengeValue) {
    res.status(200).send(challengeValue);
  } else {
    res.status(404).send('Challenge token not found');
  }
});

router.get('/certificate-status', (req, res) => {
  try {
    if (!fs.existsSync(CERT_FILE)) {
      return res.json({ valid: false, expires: null });
    }
    const certData = fs.readFileSync(CERT_FILE);
    const cert = new X509Certificate(certData);
    const expires = cert.validTo;
    const now = new Date();
    const expDate = new Date(expires);
    const valid = expDate > now;
    res.json({ valid, expires });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check certificate status' });
  }
});
// Request logging middleware
router.use((req, res, next) => {
  const logEntry = `${new Date().toISOString()} ${req.method} ${req.originalUrl} IP:${req.ip}\n`;
  fs.appendFile(LOG_PATH, logEntry, err => {
    if (err) console.error('Request log error:', err);
  });
  next();
});

// Get branding settings
router.get('/branding', async (req, res) => {
  try {
    const pool = req.pool;
    const result = await pool.query('SELECT * FROM branding ORDER BY id DESC LIMIT 1');
    res.json(result.rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: 'Failed to get branding' });
  }
});

// Admin: update branding settings (colors, fqdn)
router.put('/branding', authenticateToken, requireAdmin, async (req, res) => {
  const { bg_color, nav_color, nav_text_color, text_color, button_color, fqdn, box_border_color, box_shadow_color, box_bg_color, timezone } = req.body;
  try {
    const pool = req.pool;
    // Upsert branding row
    const brand_id = (await pool.query('SELECT id FROM branding')).rows[0].id;
    const result = await pool.query(
      'UPDATE branding SET bg_color = $1, nav_color = $2, nav_text_color = $3, text_color = $4, button_color = $5, fqdn = $6, box_border_color = $7, box_shadow_color = $8, box_bg_color = $9, timezone = $10 WHERE id = $11 RETURNING *',
      [bg_color || '', nav_color || '', nav_text_color || '', text_color || '', button_color || '', fqdn || '', box_border_color || '', box_shadow_color || '', box_bg_color || '', timezone || '', brand_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update branding' });
  }
});

// Admin: upload logo

router.post('/branding/logo', authenticateToken, requireAdmin, upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const pool = req.pool;
    // Get extension from originalname
    const ext = path.extname(req.file.originalname);
    const newFilename = req.file.filename + ext;
    const oldPath = req.file.path;
    const newPath = path.join(path.dirname(oldPath), newFilename);
    fs.renameSync(oldPath, newPath);
    const logoPath = '/uploads/' + newFilename;
    await pool.query('UPDATE branding SET logo_path = $1', [logoPath]);
    res.json({ logo_path: logoPath });
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload logo' });
  }
});

// Admin: upload icon

router.post('/branding/icon', authenticateToken, requireAdmin, upload.single('icon'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const pool = req.pool;
    // Get extension from originalname
    const ext = path.extname(req.file.originalname);
    const newFilename = req.file.filename + ext;
    const oldPath = req.file.path;
    const newPath = path.join(path.dirname(oldPath), newFilename);
    fs.renameSync(oldPath, newPath);
    const iconPath = '/uploads/' + newFilename;
    await pool.query('UPDATE branding SET icon_path = $1', [iconPath]);
    res.json({ icon_path: iconPath });
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload icon' });
  }
});

// Admin: rename committee
router.put('/committees/:id', authenticateToken, requireAdmin, async (req, res) => {
  const committeeId = req.params.id;
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Committee name required' });
  try {
    const pool = req.pool;
    const result = await pool.query(
      'UPDATE committees SET name = $1, description = $2 WHERE id = $3 RETURNING *',
      [name, description || '', committeeId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Committee not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update committee' });
  }
});

// Admin: delete committee
router.delete('/committees/:id', authenticateToken, requireAdmin, async (req, res) => {
  const committeeId = req.params.id;
  try {
    const pool = req.pool;
    // Remove member assignments
    await pool.query('DELETE FROM member_committees WHERE committee_id = $1', [committeeId]);
    // Remove ballot assignments
    await pool.query('DELETE FROM ballot_committees WHERE committee_id = $1', [committeeId]);
    // Remove the committee itself
    const result = await pool.query('DELETE FROM committees WHERE id = $1 RETURNING id', [committeeId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Committee not found' });
    res.json({ success: true, deleted_committee_id: committeeId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete committee' });
  }
});

// Admin: request ACME certificate for FQDN
router.post('/request-certificate', authenticateToken, requireAdmin, async (req, res) => {
  const fqdn = req.body.fqdn;
  if (!fqdn) return res.status(400).json({ error: 'FQDN required' });
  try {
    await getCertificate(fqdn);

    // Update nginx config with new cert paths and add HTTPS block if missing
    const nginxConfPath = '/etc/nginx/sites-available/member-voting';
  const appDir = process.env.APP_DIR || '/opt/member-voting';
  const certDir = process.env.CERT_DIR || path.join(appDir, 'backend/certs');
  const privkeyPath = path.join(certDir, 'privkey.pem');
  const certPath = path.join(certDir, 'cert.pem');
    // Build nginx config from scratch
    const httpBlock = `server {\n    listen 80;\n    server_name ${fqdn};\n    location /.well-known/acme-challenge/ {\n        proxy_pass http://localhost:4000/api/.well-known/acme-challenge/;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n    }\n    location / {\n        return 301 https://$host$request_uri;\n    }\n}`;
    const frontendDist = path.join(appDir, 'frontend/dist');
    const httpsBlock = `server {\n    listen 443 ssl;\n    server_name ${fqdn};\n    ssl_certificate ${certPath};\n    ssl_certificate_key ${privkeyPath};\n    location / {\n        root ${frontendDist};\n        try_files $uri $uri/ /index.html;\n    }\n    location /api/ {\n        proxy_pass http://localhost:4000/api/;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n    }\n    location /uploads/ {\n        proxy_pass http://localhost:4000/uploads/;\n    }\n}`;
    // Overwrite config file with new blocks
    const newConf = httpBlock + '\n\n' + httpsBlock + '\n';
    try {
      fs.writeFileSync(nginxConfPath, newConf, 'utf8');
      console.log('[NGINX] Config rebuilt from scratch.');
    } catch (err) {
      console.error(`[NGINX] Failed to write config: ${nginxConfPath}`);
      throw err;
    }

    exec('sudo nginx -t && sudo systemctl reload nginx', (error, stdout, stderr) => {
      if (error) {
        console.error(`[NGINX] Reload failed: ${stderr}`);
      } else {
        console.log('[NGINX] Reloaded successfully');
      }
    });
    res.json({ success: true, message: `Certificate successfully obtained for ${fqdn}` });
    setTimeout(() => process.exit(0), 1000); // Give response time to flush
  } catch (err) {
    res.status(500).json({ error: err.message || 'Certificate request failed' });
  }
});

// Admin: rebuild nginx config for HTTPS with existing certificate files
router.post('/rebuild-nginx-config', async (req, res, next) => {
  // Internal request bypass
  if (req.headers['x-internal-secret'] === process.env.INTERNAL_SECRET) {
    req.isInternal = true;
    return next();
  }
  authenticateToken(req, res, function() {
    requireAdmin(req, res, next);
  });
}, async (req, res) => {
  // Use FQDN from branding table
  try {
    const pool = req.pool;
    const brandingResult = await pool.query('SELECT fqdn FROM branding ORDER BY id DESC LIMIT 1');
    const branding = brandingResult.rows[0];
    if (!branding || !branding.fqdn) {
      return res.status(400).json({ error: 'FQDN not set in branding' });
    }
    const fqdn = branding.fqdn;
    const nginxConfPath = '/etc/nginx/sites-available/member-voting';
  const appDir = process.env.APP_DIR || '/opt/member-voting';
  const certDir = process.env.CERT_DIR || path.join(appDir, 'backend/certs');
  const privkeyPath = path.join(certDir, 'privkey.pem');
  const certPath = path.join(certDir, 'cert.pem');
    // Check cert files exist
    if (!fs.existsSync(certPath) || !fs.existsSync(privkeyPath)) {
      return res.status(400).json({ error: 'Certificate files not found. Please request a certificate first.' });
    }
    let conf = '';
    try {
      conf = fs.readFileSync(nginxConfPath, 'utf8');
    } catch (err) {
      console.error(`[NGINX] Failed to read config: ${nginxConfPath}`);
      throw err;
    }
    // Port 80 block: only allow ACME challenge, redirect all else to HTTPS
    const httpBlock = `server {\n    listen 80;\n    server_name ${fqdn};\n    location /.well-known/acme-challenge/ {\n        proxy_pass http://localhost:4000/api/.well-known/acme-challenge/;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n    }\n    location / {\n        return 301 https://$host$request_uri;\n    }\n}`;
    // HTTPS block
  const frontendDist = path.join(appDir, 'frontend/dist');
  const httpsBlock = `server {\n    listen 443 ssl;\n    server_name ${fqdn};\n    ssl_certificate ${certPath};\n    ssl_certificate_key ${privkeyPath};\n    location / {\n        root ${frontendDist};\n        try_files $uri $uri/ /index.html;\n    }\n    location /api/ {\n        proxy_pass http://localhost:4000/api/;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n    }\n    location /uploads/ {\n        proxy_pass http://localhost:4000/uploads/;\n    }\n}`;
    // Build nginx config from scratch
    const newConf = httpBlock + '\n\n' + httpsBlock + '\n';
    try {
      fs.writeFileSync(nginxConfPath, newConf, 'utf8');
      console.log('[NGINX] Config rebuilt from scratch.');
    } catch (err) {
      console.error(`[NGINX] Failed to write config: ${nginxConfPath}`);
      throw err;
    }
    exec('sudo nginx -t && sudo systemctl reload nginx', (error, stdout, stderr) => {
      if (error) {
        console.error(`[NGINX] Reload failed: ${stderr}`);
      } else {
        console.log('[NGINX] Reloaded successfully');
      }
    });
    res.json({ success: true, message: `Nginx config rebuilt for HTTPS with existing certificate files for ${fqdn}` });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to rebuild Nginx config' });
  }
});

// Registration enabled API
router.get('/registration-enabled', async (req, res) => {
  res.json({ enabled: await getRegistrationEnabled() });
});
router.post('/registration-enabled', authenticateToken, requireAdmin, async (req, res) => {
  await setRegistrationEnabled(!!req.body.enabled);
  res.json({ enabled: await getRegistrationEnabled() });
});

// Register member or admin
router.post('/auth/register', async (req, res) => {
  if (!(await getRegistrationEnabled())) {
    return res.status(403).json({ error: 'Registration is currently disabled.' });
  }
  let { username, password, is_admin } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  username = username.toLowerCase(); // Make username case insensitive
  try {
    const pool = req.pool;
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO members (username, password_hash, is_admin) VALUES ($1, $2, $3) RETURNING id, username, is_admin',
      [username, hash, is_admin || false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      res.status(409).json({ error: 'Username already exists' });
    } else {
      res.status(500).json({ error: 'Registration failed' });
    }
  }
});

// Login member or admin
router.post('/auth/login', async (req, res) => {
  let { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  username = username.toLowerCase(); // Make username case insensitive
  try {
    const pool = req.pool;
    const result = await pool.query('SELECT * FROM members WHERE username = $1', [username]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, username: user.username, is_admin: user.is_admin }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
    res.json({ token, user: { id: user.id, username: user.username, is_admin: user.is_admin } });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});


// Ballot routes

// Admin: create ballot
router.post('/ballots', authenticateToken, requireAdmin, async (req, res) => {
  const { title, description, start_time, end_time, quorum, acceptance_threshold, measures } = req.body;
  if (!title || !start_time || !end_time || !Array.isArray(measures) || measures.length === 0) {
    return res.status(400).json({ error: 'Missing required fields or measures' });
  }
  try {
    const pool = req.pool;
    // Create ballot
    const ballotResult = await pool.query(
      'INSERT INTO ballots (title, description, start_time, end_time, quorum, acceptance_threshold, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [title, description || '', start_time, end_time, quorum || 0, acceptance_threshold || 50, req.user.id]
    );
    const ballotId = ballotResult.rows[0].id;
    // Insert measures (support title||description format)
    const measurePromises = measures.map(measure => {
      let title = measure;
      let desc = '';
      if (typeof measure === 'string' && measure.includes('||')) {
        [title, desc] = measure.split('||');
      }
      return pool.query('INSERT INTO ballot_measures (ballot_id, measure_text, measure_description) VALUES ($1, $2, $3) RETURNING id, measure_text, measure_description', [ballotId, title, desc]);
    });
    const measureResults = await Promise.all(measurePromises);
    const insertedMeasures = measureResults.map(r => r.rows[0]);
    res.status(201).json({ ballot_id: ballotId, measures: insertedMeasures });
  } catch (err) {
    res.status(500).json({ error: 'Ballot creation failed' });
  }
});

// List ballots (all users)
router.get('/ballots', authenticateToken, async (req, res) => {
  try {
    const pool = req.pool;
    // Get all ballots and their committee assignments (both IDs and names)
    const ballotsWithCommittees = await pool.query(`
      SELECT b.*, array_agg(c.name) AS committee_names, array_agg(c.id) AS committee_ids
      FROM ballots b
      LEFT JOIN ballot_committees bc ON b.id = bc.ballot_id
      LEFT JOIN committees c ON bc.committee_id = c.id
      GROUP BY b.id
      ORDER BY b.id
    `);
    // Get member's committees
    const commRes = await pool.query('SELECT committee_id FROM member_committees WHERE member_id = $1', [req.user.id]);
    const committeeIds = commRes.rows.map(r => r.committee_id);
    // Filter ballots: assigned to member's committees or open to all
    let visibleBallots = ballotsWithCommittees.rows.map(b => {
      const assignedCommitteeIds = Array.isArray(b.committee_ids) ? b.committee_ids.filter(id => id !== null) : [];
      let is_visible = false;
      if (assignedCommitteeIds.length === 0) {
        is_visible = true; // open to all
      } else {
        is_visible = assignedCommitteeIds.some(id => committeeIds.includes(id));
      }
      return { ...b, is_visible };
    });
    // For each visible ballot, check if user has voted
    const ballotIds = visibleBallots.map(b => b.id);
    let votedMap = {};
    if (ballotIds.length > 0) {
      const votedRes = await pool.query(
        'SELECT ballot_id, COUNT(*) as count FROM votes WHERE member_id = $1 AND ballot_id = ANY($2::int[]) GROUP BY ballot_id',
        [req.user.id, ballotIds]
      );
      votedRes.rows.forEach(row => {
        votedMap[row.ballot_id] = Number(row.count) > 0;
      });
    }
    visibleBallots = visibleBallots.map(b => ({ ...b, has_voted: !!votedMap[b.id] }));
    // Filter out ballots for non-admins where is_visible is false
    if (!req.user.is_admin) {
      visibleBallots = visibleBallots.filter(b => b.is_visible);
    }
    res.json(visibleBallots);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list ballots' });
  }
});

// Get ballot details (only if member is in committee)
router.get('/ballots/:id', authenticateToken, async (req, res) => {
  const ballotId = req.params.id;
  try {
    const pool = req.pool;
    // Check if ballot is restricted to a committee
    const commRes = await pool.query('SELECT committee_id FROM ballot_committees WHERE ballot_id = $1', [ballotId]);
    if (commRes.rows.length > 0) {
      // Get member's committees
      const memberComms = await pool.query('SELECT committee_id FROM member_committees WHERE member_id = $1', [req.user.id]);
      const memberCommitteeIds = memberComms.rows.map(r => r.committee_id);
      const allowed = commRes.rows.some(r => memberCommitteeIds.includes(r.committee_id));
      if (!allowed) return res.status(403).json({ error: 'Not authorized for this ballot' });
    }
    const ballotResult = await pool.query(
      'SELECT id, title, description, start_time, end_time, quorum, acceptance_threshold, created_by, created_at FROM ballots WHERE id = $1',
      [ballotId]
    );
    if (ballotResult.rows.length === 0) return res.status(404).json({ error: 'Ballot not found' });
    const measuresResult = await pool.query(
      'SELECT id, measure_text, measure_description FROM ballot_measures WHERE ballot_id = $1',
      [ballotId]
    );
    const ballot = ballotResult.rows[0];
    ballot.measures = measuresResult.rows;
    // Check if current user has voted on any measure in this ballot
    const voteCheck = await pool.query(
      'SELECT COUNT(*) FROM votes WHERE ballot_id = $1 AND member_id = $2',
      [ballotId, req.user.id]
    );
    ballot.has_voted = Number(voteCheck.rows[0].count) > 0;
    res.json(ballot);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get ballot details' });
  }
});
router.put('/ballots/:id', authenticateToken, requireAdmin, async (req, res) => {
  const ballotId = req.params.id;
  const { title, description, start_time, end_time, quorum, acceptance_threshold, measures } = req.body;
  try {
    const pool = req.pool;
    const result = await pool.query(
      'UPDATE ballots SET title = $1, description = $2, start_time = $3, end_time = $4, quorum = $5, acceptance_threshold = $6 WHERE id = $7 RETURNING *',
      [title, description, start_time, end_time, quorum, acceptance_threshold, ballotId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Ballot not found' });

    // If measures are provided, update them
    if (Array.isArray(measures)) {
      // Get existing measures
      const existingMeasuresRes = await pool.query('SELECT id, measure_text, measure_description FROM ballot_measures WHERE ballot_id = $1', [ballotId]);
      const existingMeasures = existingMeasuresRes.rows;
      // Parse incoming measures (support {id, title, description} or string)
      const parsedMeasures = measures.map(measure => {
        if (measure !== null) {
          // Accept {id, title, description} or {title, description}
          return {
            id: measure.id,
            title: measure.title || '',
            desc: measure.description || ''
          };
        } else {
          let title = measure;
          let desc = '';
          if (typeof measure === 'string' && measure.includes('||')) {
            [title, desc] = measure.split('||');
          }
          return { title, desc };
        }
      });
      // Track IDs to keep
      const incomingIds = parsedMeasures.filter(m => m.id).map(m => m.id);
      // 1. Update existing measures by ID
      for (const pm of parsedMeasures) {
        if (pm.id) {
          // Update
          await pool.query('UPDATE ballot_measures SET measure_text = $1, measure_description = $2 WHERE id = $3', [pm.title, pm.desc, pm.id]);
        } else {
          // Add new
          await pool.query('INSERT INTO ballot_measures (ballot_id, measure_text, measure_description) VALUES ($1, $2, $3)', [ballotId, pm.title, pm.desc]);
        }
      }
      // 2. Remove measures not present in incoming
      for (const em of existingMeasures) {
        if (!incomingIds.includes(em.id)) {
          await pool.query('DELETE FROM ballot_measures WHERE id = $1', [em.id]);
        }
      }
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update ballot' });
  }
});
router.delete('/ballots/:id', authenticateToken, requireAdmin, async (req, res) => {
  // Admin: delete ballot and all related measures and votes
  const ballotId = req.params.id;
  try {
    const pool = req.pool;
    // Delete votes for this ballot
    await pool.query('DELETE FROM votes WHERE ballot_id = $1', [ballotId]);
    // Delete measures for this ballot
    await pool.query('DELETE FROM ballot_measures WHERE ballot_id = $1', [ballotId]);
    // Delete the ballot itself
    const result = await pool.query('DELETE FROM ballots WHERE id = $1 RETURNING id', [ballotId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Ballot not found' });
    res.json({ success: true, deleted_ballot_id: ballotId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete ballot' });
  }
});

// Ballot measure routes
router.post('/ballots/:id/measures', authenticateToken, requireAdmin, async (req, res) => {
  // Admin: add measure to ballot
});
router.get('/ballots/:id/measures', authenticateToken, async (req, res) => {
  // Get measures for ballot
});

// Voting routes

// Member: submit anonymous vote
router.post('/ballots/:id/vote', authenticateToken, async (req, res) => {
  const ballotId = req.params.id;
  const { votes } = req.body; // votes: [{ measure_id, vote_value }]
  if (!Array.isArray(votes) || votes.length === 0) {
    return res.status(400).json({ error: 'No votes submitted' });
  }
  try {
    const pool = req.pool;
    // Get branding timezone
    const brandingResult = await pool.query('SELECT timezone FROM branding ORDER BY id DESC LIMIT 1');
    const timezone = brandingResult.rows[0]?.timezone || 'UTC';
    // Check ballot timing
    const ballotResult = await pool.query('SELECT start_time, end_time FROM ballots WHERE id = $1', [ballotId]);
    if (ballotResult.rows.length === 0) return res.status(404).json({ error: 'Ballot not found' });
    const now = DateTime.now().setZone(timezone);
    const start = DateTime.fromISO(ballotResult.rows[0].start_time, { zone: timezone });
    const end = DateTime.fromISO(ballotResult.rows[0].end_time, { zone: timezone });
    if (now < start) return res.status(403).json({ error: 'Voting has not started yet for this ballot' });
    if (now >= end) return res.status(403).json({ error: 'Voting is not open for this ballot' });
    // Prevent duplicate votes per measure per member
    for (const v of votes) {
      const exists = await pool.query('SELECT id FROM votes WHERE ballot_id = $1 AND measure_id = $2 AND member_id = $3 AND vote_type = $4', [ballotId, v.measure_id, req.user.id, 'electronic']);
      if (exists.rows.length > 0) return res.status(409).json({ error: 'Already voted on one or more measures' });
    }
    // Insert votes (electronic)
    const votePromises = votes.map(v =>
      pool.query("INSERT INTO votes (ballot_id, measure_id, member_id, vote_value, vote_count, vote_type) VALUES ($1, $2, $3, $4, 1, $5)", [ballotId, v.measure_id, req.user.id, v.vote_value, 'electronic'])
    );
    await Promise.all(votePromises);
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Voting failed' });
  }
});

// Get ballot results (tallied, all users)
router.get('/ballots/:id/results', authenticateToken, async (req, res) => {
  const ballotId = req.params.id;
  try {
    const pool = req.pool;
    // Get measures
    const measuresResult = await pool.query('SELECT id, measure_text FROM ballot_measures WHERE ballot_id = $1', [ballotId]);
    // Get votes per measure, aggregate both electronic and paper votes
    const votesResult = await pool.query(
      `SELECT measure_id, vote_value, SUM(vote_count) as vote_count, vote_type
       FROM votes
       WHERE ballot_id = $1
       GROUP BY measure_id, vote_value, vote_type`,
      [ballotId]
    );
    // Aggregate results
    const results = measuresResult.rows.map(measure => {
      const measureVotes = votesResult.rows.filter(v => v.measure_id === measure.id);
      // Group by value, sum counts across vote_type
      const voteCounts = {};
      for (const v of measureVotes) {
        if (!voteCounts[v.vote_value]) voteCounts[v.vote_value] = 0;
        voteCounts[v.vote_value] += Number(v.vote_count);
      }
      return {
        measure_id: measure.id,
        measure_text: measure.measure_text,
        votes: Object.entries(voteCounts).map(([vote_value, vote_count]) => ({ vote_value, vote_count }))
      };
    });
    res.json({ ballot_id: ballotId, results });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get ballot results' });
  }
});

// Admin: list all members
router.get('/members', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const pool = req.pool;
    const result = await pool.query('SELECT id, username, is_admin, created_at FROM members ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list members' });
  }
});

// Admin: add member
router.post('/members', authenticateToken, requireAdmin, async (req, res) => {
  let { username, password, is_admin } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  username = username.toLowerCase(); // Make username case insensitive
  try {
    const pool = req.pool;
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO members (username, password_hash, is_admin) VALUES ($1, $2, $3) RETURNING id, username, is_admin',
      [username, hash, is_admin || false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'Username already exists' });
    } else {
      res.status(500).json({ error: 'Failed to add member' });
    }
  }
});

// Admin: edit member (username, password, admin status)
router.put('/members/:id', authenticateToken, requireAdmin, async (req, res) => {
  const memberId = req.params.id;
  let { username, password, is_admin } = req.body;
  try {
    const pool = req.pool;
    let query = 'UPDATE members SET ';
    username = username.toLowerCase(); // Make username case insensitive
    let params = [];
    let updates = [];
    if (username) { updates.push('username = $' + (params.length+1)); params.push(username); }
    if (typeof is_admin === 'boolean') { updates.push('is_admin = $' + (params.length+1)); params.push(is_admin); }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      updates.push('password_hash = $' + (params.length+1)); params.push(hash);
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    query += updates.join(', ') + ' WHERE id = $' + (params.length+1) + ' RETURNING id, username, is_admin';
    params.push(memberId);
    const result = await pool.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Member not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update member' });
  }
});

// Admin: delete member
router.delete('/members/:id', authenticateToken, requireAdmin, async (req, res) => {
  const memberId = req.params.id;
  try {
    const pool = req.pool;
    const result = await pool.query('DELETE FROM members WHERE id = $1 RETURNING id', [memberId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Member not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete member' });
  }
});

// Committee routes

// Admin: create committee
router.post('/committees', authenticateToken, requireAdmin, async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Committee name required' });
  try {
    const pool = req.pool;
    const result = await pool.query(
      'INSERT INTO committees (name, description) VALUES ($1, $2) RETURNING *',
      [name, description || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create committee' });
  }
});

// Admin: assign member to committee
router.post('/committees/:id/members', authenticateToken, requireAdmin, async (req, res) => {
  const committeeId = req.params.id;
  const { member_id } = req.body;
  if (!member_id) return res.status(400).json({ error: 'Member ID required' });
  try {
    const pool = req.pool;
    await pool.query(
      'INSERT INTO member_committees (member_id, committee_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [member_id, committeeId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to assign member to committee' });
  }
});

// Admin: restrict ballot to committee
router.post('/ballots/:id/committees', authenticateToken, requireAdmin, async (req, res) => {
  const ballotId = req.params.id;
  const { committee_id } = req.body;
  if (!committee_id) return res.status(400).json({ error: 'Committee ID required' });
  try {
    const pool = req.pool;
    await pool.query(
      'INSERT INTO ballot_committees (ballot_id, committee_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [ballotId, committee_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to restrict ballot to committee' });
  }
});

// Admin: remove member from committee
router.delete('/committees/:committeeId/members/:memberId', authenticateToken, requireAdmin, async (req, res) => {
  const { committeeId, memberId } = req.params;
  try {
    const pool = req.pool;
    await pool.query('DELETE FROM member_committees WHERE committee_id = $1 AND member_id = $2', [committeeId, memberId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove member from committee' });
  }
});

// Admin: remove ballot from committee
router.delete('/ballots/:ballotId/committees/:committeeId', authenticateToken, requireAdmin, async (req, res) => {
  const { ballotId, committeeId } = req.params;
  try {
    const pool = req.pool;
    await pool.query('DELETE FROM ballot_committees WHERE ballot_id = $1 AND committee_id = $2', [ballotId, committeeId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove ballot from committee' });
  }
});

// List committees (all users)
router.get('/committees', authenticateToken, async (req, res) => {
  try {
    const pool = req.pool;
    // Get all committees
    const committeesRes = await pool.query('SELECT * FROM committees');
    const committees = committeesRes.rows;
    // Get all member assignments
    const memberAssignmentsRes = await pool.query(`
      SELECT mc.committee_id, m.id as member_id, m.username
      FROM member_committees mc
      JOIN members m ON mc.member_id = m.id
    `);
    // Map committee_id to members
    const committeeMembersMap = {};
    memberAssignmentsRes.rows.forEach(row => {
      if (!committeeMembersMap[row.committee_id]) committeeMembersMap[row.committee_id] = [];
      committeeMembersMap[row.committee_id].push({ id: row.member_id, username: row.username });
    });
    // Attach members to each committee
    committees.forEach(c => {
      c.members = committeeMembersMap[c.id] || [];
    });
    res.json(committees);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list committees' });
  }
});

// Admin: record paper ballot lump sum for a measure
router.post('/ballots/:id/paper-votes', authenticateToken, requireAdmin, async (req, res) => {
  const ballotId = req.params.id;
  const { measure_id, yes, no, abstain } = req.body;
  if (!measure_id || (yes == null && no == null && abstain == null)) {
    return res.status(400).json({ error: 'Missing measure_id or vote counts' });
  }
  try {
    const pool = req.pool;
    // Insert or update paper votes for this measure
    // We'll use a new vote_type 'paper' in the votes table
    // Remove any existing paper votes for this measure
    await pool.query(
      `DELETE FROM votes WHERE ballot_id = $1 AND measure_id = $2 AND vote_type = 'paper'`,
      [ballotId, measure_id]
    );
    // Insert a single paper vote record for this measure for each value
    await pool.query(
      `INSERT INTO votes (ballot_id, measure_id, member_id, vote_value, vote_count, vote_type)
       VALUES ($1, $2, NULL, 'yes', $3, 'paper'),
              ($1, $2, NULL, 'no', $4, 'paper'),
              ($1, $2, NULL, 'abstain', $5, 'paper')`,
      [ballotId, measure_id, yes || 0, no || 0, abstain || 0]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record paper votes' });
  }
});

// Admin: get ballot report
router.get('/ballots/:id/report', authenticateToken, requireAdmin, async (req, res) => {
  const ballotId = req.params.id;
  try {
    const pool = req.pool;
    // Get ballot info
    const ballotResult = await pool.query('SELECT * FROM ballots WHERE id = $1', [ballotId]);
    if (ballotResult.rows.length === 0) return res.status(404).json({ error: 'Ballot not found' });
    const ballot = ballotResult.rows[0];
    // Get measures
    const measuresResult = await pool.query('SELECT id, measure_text FROM ballot_measures WHERE ballot_id = $1', [ballotId]);
    // Get votes per measure (sum vote_count for each value)
    const votesResult = await pool.query(
      `SELECT measure_id, vote_value, SUM(vote_count) as count
       FROM votes
       WHERE ballot_id = $1
       GROUP BY measure_id, vote_value`,
      [ballotId]
    );
    // Get total voters: sum electronic votes and add paper votes
    const electronicVotersResult = await pool.query('SELECT COUNT(DISTINCT member_id) as total_voters FROM votes WHERE ballot_id = $1 AND vote_type = $2', [ballotId, 'electronic']);
    const paperVotesResult = await pool.query('SELECT SUM(vote_count) as paper_total FROM votes WHERE ballot_id = $1 AND vote_type = $2', [ballotId, 'paper']);
    const totalVoters = Number(electronicVotersResult.rows[0].total_voters || 0) + Number(paperVotesResult.rows[0].paper_total || 0);
    // Quorum and acceptance
    const quorumMet = totalVoters >= ballot.quorum;
    // Aggregate results
    const results = measuresResult.rows.map(measure => {
      const measureVotes = votesResult.rows.filter(v => v.measure_id === measure.id);
      return {
        measure_id: measure.id,
        measure_text: measure.measure_text,
        votes: measureVotes.map(v => ({ value: v.vote_value, count: Number(v.count) }))
      };
    });
    // Acceptance calculation (simple majority for each measure)
    const acceptance = results.map(r => {
      const total = r.votes.reduce((sum, v) => sum + v.count, 0);
      const accepted = r.votes.some(v => v.value === 'yes' && (v.count / total) * 100 >= ballot.acceptance_threshold);
      return { measure_id: r.measure_id, accepted };
    });
    // Compose report
    const report = {
      ballot_id: ballotId,
      title: ballot.title,
      quorum: ballot.quorum,
      acceptance_threshold: ballot.acceptance_threshold,
      total_voters: totalVoters,
      quorum_met: quorumMet,
      results,
      acceptance
    };
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Change password (authenticated user)
router.post('/change-password', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Missing fields' });
  try {
    const pool = req.pool;
    const userResult = await pool.query('SELECT password_hash FROM members WHERE id = $1', [userId]);
    if (!userResult.rows.length) return res.status(404).json({ error: 'User not found' });
    const user = userResult.rows[0];
    const match = await bcrypt.compare(oldPassword, user.password_hash);
    if (!match) return res.status(403).json({ error: 'Current password is incorrect' });
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE members SET password_hash = $1 WHERE id = $2', [hashed, userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Admin: audit members who voted on a ballot (no vote values exposed)
router.get('/ballots/:id/audit', authenticateToken, requireAdmin, async (req, res) => {
  const ballotId = req.params.id;
  try {
    const pool = req.pool;
    const result = await pool.query(
      `SELECT DISTINCT m.id, m.username, m.created_at
       FROM votes v
       JOIN members m ON v.member_id = m.id
       WHERE v.ballot_id = $1`,
      [ballotId]
    );
    res.json({ ballot_id: ballotId, voters: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to audit ballot voters' });
  }
});

module.exports = router;
