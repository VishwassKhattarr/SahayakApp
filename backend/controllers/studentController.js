// backend/controllers/studentController.js
import pkg from "pg";
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const getAllStudents = async (req, res) => {
  const { class_id, section_id } = req.query;

  try {
    let query = `
      SELECT 
        s.id, s.name, s.email, s.roll_number,
        s.parent_contact, s.parent_name,
        c.class_name, sec.section_name,
        ay.year_name AS academic_year
      FROM students s
      JOIN student_class_enrollments e ON s.id = e.student_id
      JOIN sections sec ON e.section_id = sec.id
      JOIN classes c ON sec.class_id = c.id
      JOIN academic_years ay ON e.academic_year_id = ay.id
      WHERE 1=1
    `;
    const params = [];

    if (req.query.class_name) {
  params.push(req.query.class_name);
  query += ` AND c.class_name = $${params.length}`;
}


    if (section_id) {
      params.push(section_id);
      query += ` AND sec.id = $${params.length}`;
      console.log("Filtering by section_id:", section_id);
    }

    query += ` ORDER BY s.roll_number ASC`;

    const result = await pool.query(query, params);
    console.log(`Students fetched: ${result.rowCount}`);
    res.json({ success: true, students: result.rows });
  } catch (err) {
    console.error("❌ Error fetching students:", err);
    res.status(500).json({ success: false, message: "Server error fetching students" });
  }
};
