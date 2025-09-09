const express = require('express');
const router = express.Router();

// Auth routes

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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


const { authenticateToken, requireAdmin } = require('./middleware');

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
    // Insert measures
    const measurePromises = measures.map(measure =>
      pool.query('INSERT INTO ballot_measures (ballot_id, measure_text) VALUES ($1, $2) RETURNING id, measure_text', [ballotId, measure])
    );
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
      'SELECT id, measure_text FROM ballot_measures WHERE ballot_id = $1',
      [ballotId]
    );
    const ballot = ballotResult.rows[0];
    ballot.measures = measuresResult.rows;
    res.json(ballot);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get ballot details' });
  }
});
router.put('/ballots/:id', authenticateToken, requireAdmin, async (req, res) => {
  // Admin: update ballot
});
router.delete('/ballots/:id', authenticateToken, requireAdmin, async (req, res) => {
  // Admin: delete ballot
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
      const exists = await pool.query('SELECT id FROM votes WHERE ballot_id = $1 AND measure_id = $2 AND member_id = $3', [ballotId, v.measure_id, req.user.id]);
      if (exists.rows.length > 0) return res.status(409).json({ error: 'Already voted on one or more measures' });
    }
    // Insert votes
    const votePromises = votes.map(v =>
      pool.query('INSERT INTO votes (ballot_id, measure_id, member_id, vote_value) VALUES ($1, $2, $3, $4)', [ballotId, v.measure_id, req.user.id, v.vote_value])
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
    // Get votes per measure
    const votesResult = await pool.query(
      `SELECT measure_id, vote_value, COUNT(*) as count
       FROM votes
       WHERE ballot_id = $1
       GROUP BY measure_id, vote_value`,
      [ballotId]
    );
    // Aggregate results
    const results = measuresResult.rows.map(measure => {
      const measureVotes = votesResult.rows.filter(v => v.measure_id === measure.id);
      return {
        measure_id: measure.id,
        measure_text: measure.measure_text,
        votes: measureVotes.map(v => ({ value: v.vote_value, count: Number(v.count) }))
      };
    });
    res.json({ ballot_id: ballotId, results });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get ballot results' });
  }
});

// Reporting routes

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
    // Get votes per measure
    const votesResult = await pool.query(
      `SELECT measure_id, vote_value, COUNT(*) as count
       FROM votes
       WHERE ballot_id = $1
       GROUP BY measure_id, vote_value`,
      [ballotId]
    );
    // Get total votes
    const totalVotesResult = await pool.query('SELECT COUNT(DISTINCT member_id) as total_voters FROM votes WHERE ballot_id = $1', [ballotId]);
    const totalVoters = totalVotesResult.rows[0].total_voters;
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

module.exports = router;
