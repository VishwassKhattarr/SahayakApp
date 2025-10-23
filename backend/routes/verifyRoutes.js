import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/auth/verify - Verify token endpoint
router.get('/verify', verifyToken, (req, res) => {
    res.json({ valid: true, user: req.user });
});

export default router;
