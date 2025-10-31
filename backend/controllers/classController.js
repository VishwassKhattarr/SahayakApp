import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const getAllClasses = async (req, res) => {
  try {
    // ✅ Fetch unique class names (for dropdown) with year label
    const query = `
      SELECT DISTINCT ON (c.class_name)
        c.id,
        c.class_name,
        ay.year_name AS academic_year
      FROM classes c
      LEFT JOIN academic_years ay ON c.academic_year_id = ay.id
      ORDER BY c.class_name;
    `;

    const result = await pool.query(query);

    res.json({ success: true, classes: result.rows });
  } catch (err) {
    console.error('Error fetching classes:', err);
    res.status(500).json({ success: false, message: 'Server error fetching classes' });
  }
};
