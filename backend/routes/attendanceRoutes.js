import express from 'express';
import { getStudentsForAttendance, markAttendance } from '../controllers/attendanceController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/attendance/students/:sectionId
// Gets the list of students for the class teacher to mark
router.get('/students/:sectionId', verifyToken, getStudentsForAttendance);

// POST /api/attendance/mark
// Submits the attendance data
router.post('/mark', verifyToken, markAttendance);

export default router;