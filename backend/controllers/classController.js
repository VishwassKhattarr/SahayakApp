import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const getAllClasses = async (req, res) => {
  try {
    const query = `
  SELECT MIN(id) AS id, class_name
  FROM classes
  GROUP BY class_name
  ORDER BY CAST(class_name AS INTEGER);
`;


    const result = await pool.query(query);
    res.json({ success: true, classes: result.rows });

  } catch (err) {
    console.error('❌ Error fetching classes:', err);
    res.status(500).json({ success: false, message: 'Server error fetching classes' });
  }
};







