// src/routes/attendanceRoutes.js
const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');

// Route to save new attendance
// POST /api/attendance
router.post('/', attendanceController.saveAttendance);

module.exports = router;