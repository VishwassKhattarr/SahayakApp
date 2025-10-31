import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const getAllSubjects = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, subject_name FROM subjects ORDER BY id;');
    res.json({ success: true, subjects: result.rows });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ success: false, message: 'Server error fetching subjects' });
  }
};
