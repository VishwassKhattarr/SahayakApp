import express from 'express';
import { teacherLogin } from '../controllers/teacherController.js';

const router = express.Router();

// POST /api/auth/teacher/login
router.post('/teacher/login', teacherLogin);

export default router;
