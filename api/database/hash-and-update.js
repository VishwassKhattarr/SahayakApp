import pkg from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pkg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function hashPasswords(table) {
  const users = await pool.query(`SELECT id, password FROM ${table}`);
  for (const user of users.rows) {
    // Skip if already hashed (bcrypt hashes start with $2)
    if (user.password.startsWith('$2')) continue;
    const hash = await bcrypt.hash(user.password, 10);
    await pool.query(`UPDATE ${table} SET password = $1 WHERE id = $2`, [hash, user.id]);
    console.log(`Updated ${table} id ${user.id}`);
  }
  console.log(`All ${table} passwords hashed!`);
}

async function main() {
  await hashPasswords('teachers');
  await hashPasswords('admins');
  await pool.end();
}

main();