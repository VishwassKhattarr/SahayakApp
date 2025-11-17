import express from 'express';
// --- 1. IMPORT THE NEW FUNCTION ---
import { teacherLogin, getTeacherClasses, getAssignedClassTeacherSection } from '../controllers/teacherController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/auth/teacher/login
router.post('/teacher/login', teacherLogin);

// GET /api/teacher/classes
router.get('/classes', protect, getTeacherClasses);

// --- 2. ADD THE NEW ROUTE ---
// GET /api/teacher/class-teacher-section
// Checks if the teacher is a class teacher
router.get('/class-teacher-section', protect, getAssignedClassTeacherSection);


export default router;