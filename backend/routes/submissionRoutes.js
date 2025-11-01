// backend/routes/submissionRoutes.js
import express from 'express';
import { handleGoogleFormWebhook, getSubmissionsForChapter } from '../controllers/submissionController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Webhook for receiving submissions from Google Apps Script
// This route should NOT be protected by verifyToken, as it's called by Google
router.post('/google-form-webhook', handleGoogleFormWebhook);

// API for the teacher to view submissions for a chapter
router.get('/chapter/:teacherAssignmentId/:chapterId', verifyToken, getSubmissionsForChapter);

export default router;