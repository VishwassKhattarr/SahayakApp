// src/config/db.js
const { Pool } = require('pg');

// Make sure to install the dotenv package: npm install dotenv
require('dotenv').config();

// Neon requires an SSL connection. The 'pg' library handles this automatically
// when the connection string starts with 'postgresql://'.
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set.');
}

const pool = new Pool({
  connectionString,
});

module.exports = pool;