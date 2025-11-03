// backend/controllers/sectionController.js
import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const getAllSections = async (req, res) => {
  const className = req.query.class_name;

  try {
    const query = `
      SELECT DISTINCT section_name
      FROM sections sec
      JOIN classes c ON sec.class_id = c.id
      WHERE c.class_name = $1
      ORDER BY section_name;
    `;
    const result = await pool.query(query, [className]);

    res.json({ success: true, sections: result.rows });
  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({ success: false, message: 'Server error fetching sections' });
  }
};



