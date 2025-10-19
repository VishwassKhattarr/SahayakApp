import express from 'express';
import { teacherLogin, adminLogin } from '../controllers/authController.js';

const router = express.Router();

// Route for teacher login
router.post('/teacher/login', teacherLogin);

// Route for admin login
router.post('/admin/login', adminLogin);

export default router;