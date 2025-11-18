import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Helper function for the n8n webhook
const callWebhook = async (data) => {
  // --- MAKE SURE YOU ADD THIS TO YOUR .env FILE ---
  const webhookUrl = process.env.N8N_ATTENDANCE_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.warn('N8N_ATTENDANCE_WEBHOOK_URL not set in .env. Skipping webhook.');
    return;
  }

  try {
    // We don't need to wait for the webhook to finish
    // Using node-fetch (available in Node 18+)
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    console.log('Successfully triggered attendance webhook.');
  } catch (error) {
    console.error('Error triggering attendance webhook:', error.message);
  }
};

// Security check: Verify if the logged-in teacher is the class teacher for the section
const isClassTeacher = async (teacherId, sectionId) => {
  const query = `
    SELECT 1 FROM class_teacher_assignments
    WHERE teacher_id = $1 
      AND section_id = $2
      AND academic_year_id = (SELECT MAX(id) FROM academic_years);
  `;
  const result = await pool.query(query, [teacherId, sectionId]);
  return result.rows.length > 0;
};

/**
 * Get all students for a specific section.
 * Also checks if attendance has already been marked for today.
 */
export const getStudentsForAttendance = async (req, res) => {
  const { sectionId } = req.params;
  const teacherId = req.user.id;
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  try {
    // 1. Security Check
    if (!(await isClassTeacher(teacherId, sectionId))) {
      return res.status(403).json({ message: 'Access denied. You are not the class teacher for this section.' });
    }

    // 2. Check if attendance was already marked
    const attendanceCheck = await pool.query(
      'SELECT 1 FROM attendance WHERE section_id = $1 AND date = $2 LIMIT 1',
      [sectionId, today]
    );
    const alreadyMarked = attendanceCheck.rows.length > 0;

    // 3. Get student list
    const studentQuery = `
      SELECT s.id, s.name, s.roll_number
      FROM students s
      JOIN student_class_enrollments sce ON s.id = sce.student_id
      WHERE sce.section_id = $1
      ORDER BY s.roll_number, s.name;
    `;
    const studentResult = await pool.query(studentQuery, [sectionId]);

    res.json({
      success: true,
      students: studentResult.rows,
      alreadyMarked: alreadyMarked,
    });

  } catch (error) {
    console.error('Error fetching students for attendance:', error);
    res.status(500).json({ message: 'Server error fetching students' });
  }
};

/**
 * Saves attendance data submitted by the class teacher.
 */
export const markAttendance = async (req, res) => {
  const { attendance, sectionId } = req.body;
  const teacherId = req.user.id;
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  if (!attendance || !sectionId || attendance.length === 0) {
    return res.status(400).json({ message: 'Invalid attendance data provided.' });
  }

  // Use the date from the first record (should be today)
  const submissionDate = attendance[0].date;
  if (submissionDate !== today) {
     return res.status(400).json({ message: 'Attendance can only be marked for today.' });
  }

  const client = await pool.connect();
  try {
    // 1. Security Check
    if (!(await isClassTeacher(teacherId, sectionId))) {
      return res.status(403).json({ message: 'Access denied. You are not the class teacher for this section.' });
    }

    // 2. Double-check if attendance was already marked
    const attendanceCheck = await client.query(
      'SELECT 1 FROM attendance WHERE section_id = $1 AND date = $2 LIMIT 1',
      [sectionId, today]
    );
    if (attendanceCheck.rows.length > 0) {
      return res.status(409).json({ message: 'Attendance has already been marked for this section today.' });
    }

    // 3. Get class_id from section_id
    const sectionResult = await client.query('SELECT class_id FROM sections WHERE id = $1', [sectionId]);
    if (sectionResult.rows.length === 0) {
      return res.status(404).json({ message: 'Section not found.' });
    }
    const classId = sectionResult.rows[0].class_id;

    // 4. Start Transaction
    await client.query('BEGIN');

    let allRecords = []; // To send to n8n
    // 5. Loop and Insert all records
    for (const record of attendance) {
      const { student_id, status, date } = record;

      // Find the enrollment_id for this student in this section
      const enrollResult = await client.query(
        'SELECT id FROM student_class_enrollments WHERE student_id = $1 AND section_id = $2',
        [student_id, sectionId]
      );
      
      if (enrollResult.rows.length > 0) {
        const enrollmentId = enrollResult.rows[0].id;

        // Insert into attendance table
        const insertQuery = `
          INSERT INTO attendance (enrollment_id, date, status, class_id, section_id, teacher_id)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id, enrollment_id, status, date
        `;
        const newRecord = await client.query(insertQuery, [enrollmentId, date, status, classId, sectionId, teacherId]);
        
        // Add full record details for webhook
        allRecords.push({
            attendance_id: newRecord.rows[0].id,
            student_id: student_id,
            enrollment_id: newRecord.rows[0].enrollment_id,
            status: newRecord.rows[0].status,
            date: newRecord.rows[0].date,
            section_id: sectionId,
            class_id: classId,
            teacher_id: teacherId
        });

      } else {
        console.warn(`Could not find enrollment for student_id ${student_id} in section_id ${sectionId}. Skipping.`);
      }
    }

    // 6. Commit Transaction
    await client.query('COMMIT');

    // 7. Call Webhook (after successful commit)
    callWebhook({
      sectionId: sectionId,
      date: today,
      markedByTeacherId: teacherId,
      status: 'success',
      records: allRecords // Send all the details
    });

    res.status(201).json({ success: true, message: 'Attendance saved successfully!' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error marking attendance:', error);
    res.status(500).json({ message: 'Server error saving attendance' });
  } finally {
    client.release();
  }
};