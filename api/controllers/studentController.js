// src/controllers/studentController.js
const pool = require('../config/db');

// Get all students
exports.getAllStudents = async (req, res) => {
  try {
    const query = 'SELECT id, name, roll_number FROM students ORDER BY roll_number ASC';
    const { rows } = await pool.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ message: 'Server error while fetching students.' });
  }
};