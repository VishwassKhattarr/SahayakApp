// backend/routes/submissionRoutes.js
import express from 'express';
// ✅ FIX: Yahan se 'handleGoogleFormWebhook' hata diya gaya hai
import { getSubmissionsForChapter } from '../controllers/submissionController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Webhook route (router.post('/google-form-webhook', ...)) yahan se hata diya gaya hai
// kyunki aapka n8n workflow use handle kar raha hai.

// API for the teacher to view submissions for a chapter
router.get('/chapter/:teacherAssignmentId/:chapterId', verifyToken, getSubmissionsForChapter);

export default router;