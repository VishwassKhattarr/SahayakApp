// backend/controllers/teacherController.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pkg from 'pg';
// Create a local Pool using environment variables (no external db.js file required)
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
    const query = 'SELECT id, name, email, status, to_char(created_at, \'YYYY-MM-DD\') AS joined_on FROM teachers ORDER BY id ASC';
    const result = await pool.query(query);
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

// Get classes assigned to a teacher
export const getTeacherClasses = async (req, res) => {
  try {
    // Get teacher ID from JWT token
    console.log('User from token:', req.user);
    const teacherId = req.user.id;

    if (!teacherId) {
      console.error('No teacher ID in token');
      return res.status(400).json({ message: 'Invalid teacher ID' });
    }

    console.log('Fetching classes for teacher:', teacherId);

    // ✅ *** FIX APPLIED HERE ***
    // Changed the academic year filter from 'is_current = true' 
    // to use MAX(id) to find the current year.
    const query = `
      SELECT DISTINCT
        tca.id as teacher_assignment_id,
        cls.class_name,
        sec.section_name,
        sub.subject_name,
        tca.subject_id,
        CONCAT(cls.class_name, ' - ', sec.section_name) as name
      FROM teacher_class_assignments tca
      JOIN classes cls ON tca.class_id = cls.id
      JOIN sections sec ON tca.section_id = sec.id
      JOIN subjects sub ON tca.subject_id = sub.id
      WHERE tca.teacher_id = $1
      AND tca.academic_year_id = (
        SELECT MAX(id) FROM academic_years
      )
      ORDER BY cls.class_name, sec.section_name`;
    console.log('Executing query with teacher ID:', teacherId);
    const result = await pool.query(query, [teacherId]);
    console.log('Query result:', result.rows);

    if (result.rows.length === 0) {
      return res.json([]);  // Return empty array instead of error for no classes
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching teacher classes:', error);
    res.status(500).json({ 
      message: 'Error fetching classes',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined 
   });
 }
};

// Assign Subject Teacher
export const assignTeacher = async (req, res) => {
  try {
    const { teacher_id, class_id, section_id, subject_id, academic_year_id } = req.body;

    // Validation
    if (!teacher_id || !class_id || !section_id || !subject_id || !academic_year_id) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    // Insert into teacher_class_assignments table
    const result = await pool.query(
      'INSERT INTO teacher_class_assignments (teacher_id, class_id, section_id, subject_id, academic_year_id, assigned_on) VALUES ($1, $2, $3, $4, $5, CURRENT_DATE) ON CONFLICT DO NOTHING RETURNING id',
      [teacher_id, class_id, section_id, subject_id, academic_year_id]
    );

    if (result.rows.length > 0) {
      res.json({ success: true, message: 'Teacher assigned successfully' });
    } else {
      res.json({ success: true, message: 'Teacher already assigned to this class.' });
    }
  } catch (error) {
    console.error('Error assigning teacher:', error.message);
    res.status(500).json({ success: false, message: 'Server error assigning teacher' });
  }
};

// --- NEW FUNCTION FOR ASSIGNING CLASS TEACHER ---
/**
 * Assigns a single "Class Teacher" to a section for a specific academic year.
 * This uses an "upsert" to replace any existing teacher for that section/year.
 */
export const assignClassTeacher = async (req, res) => {
  try {
    const { teacher_id, section_id, academic_year_id } = req.body;

    // Validation
    if (!teacher_id || !section_id || !academic_year_id) {
      return res.status(400).json({ success: false, message: 'Missing required fields (teacher, section, year)' });
    }
    
    // Upsert query: 
    // Inserts a new assignment.
    // If an assignment for that section+year already exists (conflict), 
    // it UPDATES the teacher_id instead.
    const query = `
      INSERT INTO class_teacher_assignments (teacher_id, section_id, academic_year_id, assigned_on)
      VALUES ($1, $2, $3, CURRENT_DATE)
      ON CONFLICT (section_id, academic_year_id)
      DO UPDATE SET
        teacher_id = EXCLUDED.teacher_id,
        assigned_on = CURRENT_DATE
      RETURNING id;
    `;
    
    const result = await pool.query(query, [teacher_id, section_id, academic_year_id]);

    if (result.rows.length > 0) {
      res.json({ success: true, message: 'Class Teacher assigned successfully' });
    } else {
      res.status(500).json({ success: false, message: 'Assignment failed, no row returned.' });
    }
  } catch (error) {
    console.error('❌ Error assigning class teacher:', error.message);
    res.status(500).json({ success: false, message: 'Server error assigning class teacher' });
  }
};
// ... (at the end of backend/controllers/teacherController.js)

/**
 * Checks if the logged-in teacher is a Class Teacher for any section
 * in the current academic year.
 */
export const getAssignedClassTeacherSection = async (req, res) => {
  const teacherId = req.user.id;
  try {
    const query = `
      SELECT cta.section_id, sec.section_name, cls.class_name
      FROM class_teacher_assignments cta
      JOIN sections sec ON cta.section_id = sec.id
      JOIN classes cls ON sec.class_id = cls.id
      WHERE cta.teacher_id = $1
        AND cta.academic_year_id = (SELECT MAX(id) FROM academic_years)
      LIMIT 1;
    `;
    const result = await pool.query(query, [teacherId]);

    if (result.rows.length > 0) {
      const section = result.rows[0];
      res.json({
        success: true,
        isClassTeacher: true,
        sectionId: section.section_id,
        sectionName: `${section.class_name}-${section.section_name}`
      });
    } else {
      res.json({ success: true, isClassTeacher: false });
    }
  } catch (error) {
    console.error('Error checking class teacher status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};