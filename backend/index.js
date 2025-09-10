require('dotenv').config();
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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
