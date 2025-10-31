import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pkg from 'pg';
// Create a local Pool using environment variables (no external db.js file required)
// import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const teacherLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password.' });
        }

        // Get teacher from database
        const result = await pool.query('SELECT * FROM teachers WHERE email = $1', [email]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const teacher = result.rows[0];

        // Verify password
        const validPassword = await bcrypt.compare(password, teacher.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Create JWT token
        const token = jwt.sign(
            { id: teacher.id, email: teacher.email, role: 'teacher' },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '1d' }
        );

        res.json({
            token,
            teacher: {
                id: teacher.id,
                name: teacher.name,
                email: teacher.email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getAllTeachers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, email, status, to_char(created_at, 'YYYY-MM-DD') AS joined_on
      FROM teachers
      ORDER BY id ASC;
    `);
    res.json({ success: true, teachers: result.rows });
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({ success: false, message: 'Server error fetching teachers' });
  }
};

export const toggleTeacherStatus = async (req, res) => {
  const { id } = req.params;

  try {
    // Get current status
    const current = await pool.query('SELECT status FROM teachers WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    const newStatus = current.rows[0].status === 'active' ? 'inactive' : 'active';

    // Update status
    const update = await pool.query(
      'UPDATE teachers SET status = $1 WHERE id = $2 RETURNING id, name, email, status',
      [newStatus, id]
    );

    res.json({
      success: true,
      message: `Teacher status changed to ${newStatus}`,
      teacher: update.rows[0]
    });
  } catch (error) {
    console.error('Error toggling status:', error);
    res.status(500).json({ success: false, message: 'Server error updating teacher status' });
  }
};

// backend/controllers/teacherController.js

// export const assignTeacher = async (req, res) => {
//   const { teacher_id, class_id, section_id, subject_id, academic_year_id } = req.body;

//   // ✅ Step 1: Validate required fields
//   if (!teacher_id || !class_id || !section_id || !subject_id || !academic_year_id) {
//     return res.status(400).json({ success: false, message: "All fields are required." });
//   }

//   try {
//     // ✅ Step 2: Check for duplicate assignment
//     const existing = await pool.query(
//       `SELECT * FROM teacher_class_assignments
//        WHERE teacher_id = $1 AND class_id = $2 AND section_id = $3 
//        AND subject_id = $4 AND academic_year_id = $5`,
//       [teacher_id, class_id, section_id, subject_id, academic_year_id]
//     );

//     if (existing.rows.length > 0) {
//       return res.status(409).json({
//         success: false,
//         message: "This teacher is already assigned to the same class, section, and subject for this academic year."
//       });
//     }

//     // ✅ Step 3: Insert new assignment
//     const insert = await pool.query(
//       `INSERT INTO teacher_class_assignments
//       (teacher_id, class_id, section_id, subject_id, academic_year_id)
//       VALUES ($1, $2, $3, $4, $5)
//       RETURNING id, teacher_id, class_id, section_id, subject_id, academic_year_id, assigned_at`,
//       [teacher_id, class_id, section_id, subject_id, academic_year_id]
//     );

//     res.status(201).json({
//       success: true,
//       message: "Teacher assigned successfully!",  
//       assignment: insert.rows[0]
//     });
//   } catch (error) {
//     console.error("Error assigning teacher:", error);
//     res.status(500).json({
//       success: false,
//       message: "Server error assigning teacher."
//     });
//   }
// };

export const assignTeacher = async (req, res) => {
  try {
    const { teacher_id, class_id, section_id, subject_id, academic_year_id } = req.body;

    // Validation
    if (!teacher_id || !class_id || !section_id || !subject_id || !academic_year_id) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Insert into teacher_class_assignments table
    const query = `
      INSERT INTO teacher_class_assignments
      (teacher_id, class_id, section_id, subject_id, academic_year_id, assigned_on)
      VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)
      ON CONFLICT DO NOTHING
      RETURNING id;
    `;

    const result = await pool.query(query, [
      teacher_id,
      class_id,
      section_id,
      subject_id,
      academic_year_id,
    ]);

    if (result.rows.length > 0) {
      res.json({ success: true, message: 'Teacher assigned successfully ✅' });
    } else {
      res.json({ success: true, message: 'Teacher already assigned to this class.' });
    }
  } catch (error) {
    console.error('❌ Error assigning teacher:', error.message);
    res.status(500).json({ success: false, message: 'Server error assigning teacher' });
  }
};


