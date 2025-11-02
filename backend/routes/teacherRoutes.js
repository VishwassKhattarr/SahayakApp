import express from 'express';
import { teacherLogin, getTeacherClasses } from '../controllers/teacherController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/auth/teacher/login
router.post('/teacher/login', teacherLogin);

// GET /api/teacher/classes
router.get('/classes', protect, getTeacherClasses);

export default router;
