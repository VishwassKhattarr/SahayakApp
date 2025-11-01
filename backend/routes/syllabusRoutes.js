// backend/routes/syllabusRoutes.js
import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { getTrackers, getTrackerDetails, markChapterComplete, getWorksheet } from '../controllers/syllabuscontroller.js';

const router = express.Router();

// GET /api/syllabus/trackers
router.get('/trackers', verifyToken, getTrackers);

// GET /api/syllabus/tracker/1 (The ID is the teacher_assignment_id)
router.get('/tracker/:teacherAssignmentId', verifyToken, getTrackerDetails);

// POST /api/syllabus/complete
router.post('/complete', verifyToken, markChapterComplete);

// NEW: GET /api/syllabus/worksheet/1/5
// Gets the stored worksheet/answer key for a specific assignment and chapter
router.get('/worksheet/:teacherAssignmentId/:chapterId', verifyToken, getWorksheet);

export default router;