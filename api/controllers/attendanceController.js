// src/controllers/attendanceController.js
const pool = require('../config/db');

exports.saveAttendance = async (req, res) => {
  const { presentIds } = req.body;
  const attendanceDate = new Date(); // Use server's date for consistency

  // Basic validation
  if (!Array.isArray(presentIds)) {
    return res.status(400).json({ message: 'Invalid data format.' });
  }

  try {
    // Step 1: Get all student IDs from the database
    const allStudentsResult = await pool.query('SELECT id FROM students');
    const allStudentIds = allStudentsResult.rows.map(student => student.id);

    // Step 2: Prepare the data for insertion
    const attendanceRecords = allStudentIds.map(studentId => {
      // Check if the student's ID is in the `presentIds` array
      const status = presentIds.includes(studentId) ? 'Present' : 'Absent';
      return [studentId, attendanceDate, status];
    });

    // Step 3: Insert all records into the database
    // We will loop and insert one by one for simplicity
    for (const record of attendanceRecords) {
      const query = 'INSERT INTO attendance (student_id, attendance_date, status) VALUES ($1, $2, $3)';
      await pool.query(query, record);
    }
    
    res.status(201).json({ message: 'Attendance saved successfully!' });

  } catch (error) {
    console.error('Error saving attendance:', error);
    res.status(500).json({ message: 'Server error while saving attendance.' });
  }
};