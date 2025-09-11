const express = require('express');
const fs = require('fs');
const LOG_PATH = process.env.REQUEST_LOG_PATH || './request.log';
const router = express.Router();

// Auth routes

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const multer = require('multer');
const upload = multer({ dest: path.join(__dirname, 'uploads/') });

const { authenticateToken, requireAdmin } = require('./middleware');
const { getCertificate } = require('./acme');
// ACME HTTP-01 challenge route
router.get('/.well-known/acme-challenge/:token', (req, res) => {
  const token = req.params.token;
  const challengeValue = global.__acmeChallengeValue;
  console.log(`[ACME Challenge] Received request for token: ${token}`);
  if (token && challengeValue) {
    console.log(`[ACME Challenge] Responding with challenge value: ${challengeValue}`);
    res.send(challengeValue);
  } else {
    console.warn(`[ACME Challenge] Challenge not found for token: ${token}`);
    res.status(404).end();
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
  const { bg_color, nav_color, nav_text_color, text_color, button_color, fqdn } = req.body;
  try {
    const pool = req.pool;
    // Upsert branding row
    const brand_id = (await pool.query('SELECT id FROM branding')).rows[0].id;
    const result = await pool.query(
      'UPDATE branding SET bg_color = $1, nav_color = $2, nav_text_color = $3, text_color = $4, button_color = $5, fqdn = $6 WHERE id = $7 RETURNING *',
      [bg_color || '', nav_color || '', nav_text_color || '', text_color || '', button_color || '', fqdn || '', brand_id]
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


// Register member or admin
router.post('/auth/register', async (req, res) => {
  const { username, password, is_admin } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
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
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
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
    const result = await pool.query(
      `SELECT b.id, b.title, b.description, b.start_time, b.end_time, b.quorum, b.acceptance_threshold, b.created_by, b.created_at,
        json_agg(m.measure_text) AS measures
        FROM ballots b
        LEFT JOIN ballot_measures m ON b.id = m.ballot_id
        GROUP BY b.id`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list ballots' });
  }
});

// Get ballot details (all users)
router.get('/ballots/:id', authenticateToken, async (req, res) => {
  const ballotId = req.params.id;
  try {
    const pool = req.pool;
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
      // Remove existing measures for this ballot
      await pool.query('DELETE FROM ballot_measures WHERE ballot_id = $1', [ballotId]);
      // Insert new measures
      const measurePromises = measures.map(measure => {
        let title = measure;
        let desc = '';
        if (typeof measure === 'string' && measure.includes('||')) {
          [title, desc] = measure.split('||');
        }
        return pool.query('INSERT INTO ballot_measures (ballot_id, measure_text, measure_description) VALUES ($1, $2, $3) RETURNING id, measure_text, measure_description', [ballotId, title, desc]);
      });
      await Promise.all(measurePromises);
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
    // Check ballot timing
    const ballotResult = await pool.query('SELECT start_time, end_time FROM ballots WHERE id = $1', [ballotId]);
    if (ballotResult.rows.length === 0) return res.status(404).json({ error: 'Ballot not found' });
    const now = new Date();
    const start = new Date(ballotResult.rows[0].start_time);
    const end = new Date(ballotResult.rows[0].end_time);
    if (now < start || now > end) return res.status(403).json({ error: 'Voting is not open for this ballot' });
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
  const { username, password, is_admin } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
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
  const { username, password, is_admin } = req.body;
  try {
    const pool = req.pool;
    let query = 'UPDATE members SET ';
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

// Reporting routes
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

// Admin: request ACME certificate for FQDN
router.post('/request-certificate', authenticateToken, requireAdmin, async (req, res) => {
  const fqdn = req.body.fqdn;
  if (!fqdn) return res.status(400).json({ error: 'FQDN required' });
  try {
  console.log(`[Request Certificate] Starting certificate request for FQDN: ${fqdn}`);
  await getCertificate(fqdn);
  console.log(`[Request Certificate] Certificate successfully obtained for FQDN: ${fqdn}`);
  res.json({ success: true, message: `Certificate successfully obtained for ${fqdn}` });
  console.log('[Request Certificate] Restarting process to reload certificate...');
  process.exit(0); // Restart to reload cert
  } catch (err) {
  console.error(`[Request Certificate] Error requesting certificate for FQDN: ${fqdn}`);
  console.error(err);
  res.status(500).json({ error: err.message || 'Certificate request failed', details: err.toString() });
  }
});

module.exports = router;
