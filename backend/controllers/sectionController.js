import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const getAllSections = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, section_name FROM sections ORDER BY id;');
    res.json({ success: true, sections: result.rows });
  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({ success: false, message: 'Server error fetching sections' });
  }
};
