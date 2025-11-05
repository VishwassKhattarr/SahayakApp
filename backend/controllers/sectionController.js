// backend/controllers/sectionController.js
import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const getAllSections = async (req, res) => {
  const className = req.query.class_name;

  try {
    let query;
    let params = [];
    
    if (className) {
      // If class_name is provided, filter sections by class
      query = `
        SELECT sections.id, section_name
        FROM sections
        JOIN classes ON sections.class_id = classes.id
        WHERE classes.class_name = $1
        ORDER BY section_name;
      `;
      params = [className];
    } else {
      // If no class_name, return unique sections with first occurrence ID
      query = `
        SELECT DISTINCT ON (section_name) id, section_name
        FROM sections
        ORDER BY section_name, id;
      `;
    }
    
    const result = await pool.query(query, params);
    res.json({ success: true, sections: result.rows });
  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({ success: false, message: 'Server error fetching sections' });
  }
};



