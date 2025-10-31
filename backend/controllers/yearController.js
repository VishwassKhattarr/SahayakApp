import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const getAllYears = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, year_name FROM academic_years ORDER BY id;');
    res.json({ success: true, academic_years: result.rows });
  } catch (error) {
    console.error('Error fetching years:', error);
    res.status(500).json({ success: false, message: 'Server error fetching years' });
  }
};
