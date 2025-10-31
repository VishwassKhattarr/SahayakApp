import fs from 'fs';
import csv from 'csv-parser';
import validator from 'validator';
import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const uploadStudentsCsv = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No CSV uploaded' });

  const filePath = req.file.path;
  const results = { inserted: 0, updated: 0, invalid: [], errors: [] };

  try {
    const rows = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => rows.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    for (const [i, raw] of rows.entries()) {
      const row = {};
      for (const k of Object.keys(raw)) row[k.trim().toLowerCase()] = raw[k]?.trim();

      const { name, email, roll_number, class_id, section_id, parent_contact } = row;

      if (!name || !email || !validator.isEmail(email)) {
        results.invalid.push({ row: i + 1, reason: 'Invalid data', data: row });
        continue;
      }

      try {
        const query = `
          INSERT INTO students (name, email, roll_number, class_id, section_id, parent_contact)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (email)
          DO UPDATE SET name = EXCLUDED.name, roll_number = EXCLUDED.roll_number,
          class_id = EXCLUDED.class_id, section_id = EXCLUDED.section_id, parent_contact = EXCLUDED.parent_contact;
        `;
        await pool.query(query, [name, email, roll_number, class_id, section_id, parent_contact]);
        results.inserted++;
      } catch (err) {
        results.errors.push({ row: i + 1, error: err.message });
      }
    }

    fs.unlinkSync(filePath);
    return res.json({ success: true, summary: results });
  } catch (err) {
    fs.unlinkSync(filePath);
    return res.status(500).json({ success: false, message: err.message });
  }
};
