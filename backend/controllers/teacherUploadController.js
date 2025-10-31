// // // api/controllers/teacherUploadController.js
// // import fs from 'fs';
// // import csv from 'csv-parser';
// // import bcrypt from 'bcryptjs';
// // import validator from 'validator';
// // import path from 'path';
// // import { fileURLToPath } from 'url';
// // import db from '../database/index.js'; // adapt to your DB export

// // const SALT_ROUNDS = 10;

// // export const uploadTeachersCsv = async (req, res) => {
// //   if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

// //   const results = {
// //     inserted: 0,
// //     updated: 0,
// //     invalid: [],
// //     errors: []
// //   };

// //   const filePath = req.file.path;

// //   try {
// //     const rows = [];
// //     await new Promise((resolve, reject) => {
// //       fs.createReadStream(filePath)
// //         .pipe(csv())
// //         .on('data', (row) => rows.push(row))
// //         .on('end', () => resolve())
// //         .on('error', (err) => reject(err));
// //     });

// //     // For each row validate and upsert
// //     for (const [i, raw] of rows.entries()) {
// //       // Normalize keys (in case user has uppercase headers)
// //       const row = {};
// //       for (const k of Object.keys(raw)) row[k.trim().toLowerCase()] = raw[k].trim();

// //       const name = row['name'] || '';
// //       const email = row['email'] || '';
// //       const password = row['password'] || '';

// //       if (!name || !email || !password || !validator.isEmail(email)) {
// //         results.invalid.push({ row: i + 1, reason: 'missing/invalid fields', data: raw });
// //         continue;
// //       }

// //       try {
// //         // Hash password
// //         const hashed = await bcrypt.hash(password, SALT_ROUNDS);

// //         // Example using MySQL-style upsert. Adapt queries if you use another DB.
// //         // Assumes teachers table with columns: teacher_id (auto), name, email (UNIQUE), password, status
// //         const upsertQuery = `
// //           INSERT INTO teachers (name, email, password, status)
// //           VALUES (?, ?, ?, 'active')
// //           ON DUPLICATE KEY UPDATE 
// //             name = VALUES(name),
// //             password = VALUES(password),
// //             status = 'active';
// //         `;
// //         const params = [name, email, hashed];
// //         await db.query(upsertQuery, params);

// //         // To tell whether it was inserted or updated, you can do a SELECT to check existence before.
// //         // For simplicity we attempt SELECT first:
// //         // (Optional) implement detection:
// //         // const [existing] = await db.query('SELECT teacher_id FROM teachers WHERE email = ?', [email]);
// //         // if (existing && existing.length) results.updated++; else results.inserted++;

// //         // Simpler approach: try update first, if affectedRows==0 then insert
// //         // But above ON DUPLICATE KEY covers both. We'll approximate:
// //         results.inserted++; // conservative: count as inserted (or track more precisely if needed)
// //       } catch (err) {
// //         results.errors.push({ row: i + 1, error: err.message });
// //       }
// //     }

// //     // delete file after processing
// //     fs.unlink(filePath, () => {});

// //     return res.json({ success: true, summary: results });
// //   } catch (err) {
// //     // cleanup
// //     try { fs.unlinkSync(filePath); } catch (e) {}
// //     return res.status(500).json({ success: false, error: err.message });
// //   }
// // };


// // api/controllers/teacherUploadController.js
// import fs from 'fs';
// import csv from 'csv-parser';
// import bcrypt from 'bcryptjs';
// import validator from 'validator';
// import db from '../database/index.js'; // adjust path if needed

// const SALT_ROUNDS = 10;

// /**
//  * Handles CSV upload and inserts/updates teachers
//  * CSV columns required: name, email, password
//  */
// export const uploadTeachersCsv = async (req, res) => {
//   if (!req.file) {
//     return res.status(400).json({ success: false, message: 'No CSV file uploaded' });
//   }

//   const results = {
//     inserted: 0,
//     updated: 0,
//     invalid: [],
//     errors: []
//   };

//   const filePath = req.file.path;
// //   console.log("📄 Processing row:", row);
//   try {
//     const rows = [];

//     // Step 1: Read CSV
//     await new Promise((resolve, reject) => {
//       fs.createReadStream(filePath)
//         .pipe(csv())
//         .on('data', (row) => rows.push(row))
//         .on('end', () => resolve())
//         .on('error', (err) => reject(err));
//     });

//     // Step 2: Process each row
//     for (const [i, raw] of rows.entries()) {
//       // Normalize keys (to handle Name/Email/Password variations)
//       const row = {};
//       for (const k of Object.keys(raw)) {
//         row[k.trim().toLowerCase()] = raw[k]?.trim();
//       }

//       const name = row['name'];
//       const email = row['email'];
//       const password = row['password'];

//       // Validate required fields
//       if (!name || !email || !password || !validator.isEmail(email)) {
//         results.invalid.push({ row: i + 1, reason: 'Missing/Invalid fields', data: raw });
//         continue;
//       }
//       console.log("📄 Processing row:", row);

//       try {
//         // Step 3: Check if teacher already exists
//         const [existing] = await db.query('SELECT id FROM teachers WHERE email = ?', [email]);

//         const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

//         if (existing && existing.length > 0) {
//           // Update existing record
//           await db.query(
//             'UPDATE teachers SET name = ?, password = ? WHERE email = ?',
//             [name, hashedPassword, email]
//           );
//           results.updated++;
//         } else {
//           // Insert new teacher
//           await db.query(
//             'INSERT INTO teachers (name, email, password) VALUES (?, ?, ?)',
//             [name, email, hashedPassword]
//           );
//           results.inserted++;
//         }
//       } catch (err) {
//         console.error(`❌ Error in row ${i + 1}:`, err);
//         results.errors.push({ row: i + 1, error: err.message });
//       }
//     }

//     // Step 4: Cleanup file
//     fs.unlink(filePath, () => {});

//     // Step 5: Send response
//     return res.json({ success: true, summary: results });
//   } catch (err) {
//     try { fs.unlinkSync(filePath); } catch (_) {}
//     return res.status(500).json({ success: false, error: err.message });
//   }
// };



import fs from 'fs';
import csv from 'csv-parser';
import bcrypt from 'bcryptjs';
import validator from 'validator';
// Create a local Pool using environment variables (no external db.js file required)
import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const SALT_ROUNDS = 10;

export const uploadTeachersCsv = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No CSV file uploaded' });
  }

const results = {
  inserted: 0,
  updated: 0,
  alreadyExists: 0,
  invalid: [],
  errors: []
};



  const filePath = req.file.path;

  console.log('📁 Processing CSV file:', filePath);
  console.log('🔗 Database URL set:', !!process.env.DATABASE_URL);

  try {
    const rows = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => rows.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`📊 Found ${rows.length} rows in CSV`);

    for (const [i, raw] of rows.entries()) {
      const row = {};
      for (const k of Object.keys(raw)) {
        row[k.trim().toLowerCase()] = raw[k]?.trim();
      }

      const name = row['name'];
      const email = row['email'];
      const password = row['password'];

      console.log(`🔍 Processing row ${i + 1}:`, { name, email, password: password ? '[HIDDEN]' : undefined });

      if (!name || !email || !password || !validator.isEmail(email)) {
        console.log(`❌ Invalid row ${i + 1}: missing fields`);
        results.invalid.push({ row: i + 1, reason: 'Missing/Invalid fields', data: raw });
        continue;
      }

      // try {
      //   const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      //   // ✅ PostgreSQL upsert syntax using ON CONFLICT
      //   const query = `
      //     INSERT INTO teachers (name, email, password)
      //     VALUES ($1, $2, $3)
      //     ON CONFLICT (email)
      //     DO UPDATE SET
      //       name = EXCLUDED.name,
      //       password = EXCLUDED.password
      //     RETURNING *;
      //   `;

      try {
  // 🔍 Step 1: check if teacher already exists
  const existing = await pool.query('SELECT * FROM teachers WHERE email = $1', [email]);

  if (existing.rows.length > 0) {
    // record already exists, skip insertion
    results.alreadyExists++;
    console.log(`⚠️ Teacher ${email} already exists, skipping.`);
    continue; // skip to next row
  }

  // else proceed to insert new teacher
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const query = `
    INSERT INTO teachers (name, email, password)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;

  const { rows: insertedRows } = await pool.query(query, [name, email, hashedPassword]);

  if (insertedRows.length > 0) {
    results.inserted++;
    console.log(`📝 Teacher ${email} inserted successfully`);
  }

} catch (err) {
  console.error(`❌ DB error on row ${i + 1}:`, err.message);
  results.errors.push({ row: i + 1, error: err.message });
}


      //   console.log(`🔄 Executing query for ${email}`);
      //   const { rows: updatedRows } = await pool.query(query, [name, email, hashedPassword]);

      //   console.log(`✅ Query result: ${updatedRows.length} rows returned`);
      //   if (updatedRows.length > 0) {
      //     results.inserted++;
      //     console.log(`📝 Teacher ${email} processed successfully`);
      //   } else {
      //     console.log(`⚠️ No rows returned for ${email}`);
      //   }
      // } catch (err) {
      //   console.error(`❌ DB error on row ${i + 1}:`, err.message);
      //   results.errors.push({ row: i + 1, error: err.message });
      // }
    }

    console.log('📋 Final results:', results);
    fs.unlink(filePath, () => {});
    return res.json({ success: true, summary: results });

  } catch (err) {
    console.error('💥 General error:', err);
    try { fs.unlinkSync(filePath); } catch (_) {}
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const addSingleTeacher = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  try {
    // Check if teacher already exists
    const existing = await pool.query('SELECT * FROM teachers WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Teacher already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const insertQuery = `
      INSERT INTO teachers (name, email, password)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const { rows } = await pool.query(insertQuery, [name, email, hashedPassword]);

    return res.json({
      success: true,
      message: `Teacher ${rows[0].name} added successfully.`,
      teacher: rows[0],
    });

  } catch (err) {
    console.error('❌ Error adding teacher:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

