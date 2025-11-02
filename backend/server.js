// backend/server.js
import 'dotenv/config'; // ESM way to load .env variables
import express from 'express';
import contentRoutes from './routes/contentRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import verifyRoutes from './routes/verifyRoutes.js';
import syllabusRoutes from './routes/syllabusRoutes.js';
import submissionRoutes from './routes/submissionRoutes.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import reportRoutes from "./routes/reportRoutes.js";

// ESM equivalent of __dirname and __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup
// Serve compiled/dev static from both src and public so pages can be reached
app.use(express.static(path.join(__dirname, '..', 'frontend', 'src','scripts')));
app.use(express.static(path.join(__dirname, '..', 'frontend', 'src',)));

app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));
app.use('/scripts', express.static(path.join(__dirname, '..', 'frontend', 'src', 'scripts')));

app.use(express.json());

// Content generation routes
app.use('/api/content', contentRoutes);

// Auth routes
app.use('/api/auth', teacherRoutes);
app.use('/api/auth', adminRoutes);
app.use('/api/auth', verifyRoutes);
app.use("/api/reports", reportRoutes);

// Teacher routes - ensure it's before any other routes using teacherRoutes
app.use('/api/teacher', teacherRoutes);
// Auth routes that also use teacherRoutes should come after
app.use('/api/auth', teacherRoutes);

// Syllabus Tracker routes
app.use('/api/syllabus', syllabusRoutes);
app.use('/api/submissions', submissionRoutes);



// Teacher upload routes (under /api for consistency)
app.use('/api', adminRoutes);
app.use("/api/reports", reportRoutes);

// Simple root route
// Serve root from public index if present, otherwise fallback to content generator
app.get('/', (req, res) => {
    const publicIndex = path.join(__dirname, '..', 'frontend', 'public', 'index.html');
    if (fs.existsSync(publicIndex)) {
        return res.sendFile(publicIndex);
    }
    res.sendFile(path.join(__dirname, '..', 'frontend', 'src', 'pages', 'content-generation.html'));
});

// Import authentication middleware
import { verifyToken } from './middleware/authMiddleware.js';

// Handle direct page requests for HTML files in the pages directory with authentication
app.get('/pages/:page', (req, res) => {
    const pagePath = path.join(__dirname, '..', 'frontend', 'src', 'pages', req.params.page);
    if (fs.existsSync(pagePath)) {
        // Check if the page requires authentication
        // ✅ ADDED worksheet-submissions.html here
        const teacherPages = ['teacher-dashboard.html', 'attendance.html', 'content-generation.html', 'syllabus-detail.html', 'worksheet-submissions.html'];
        const adminPages = ['admin-dashboard.html', 'admin-add-teacher.html', 'admin-assign-teacher.html', 'admin-upload-students.html', 'admin-view-students.html', 'admin-view-teachers.html'];

        if (teacherPages.includes(req.params.page) || adminPages.includes(req.params.page)) {
            // Apply authentication middleware for protected pages
            verifyToken(req, res, () => {
                // After token verification, check user role
                if (adminPages.includes(req.params.page) && req.user.role !== 'admin') {
                    return res.redirect('/pages/admin-login.html');
                }
                if (teacherPages.includes(req.params.page) && req.user.role !== 'teacher') {
                    return res.redirect('/pages/teacher-login.html');
                }
                res.sendFile(pagePath);
            });
        } else {
            res.sendFile(pagePath);
        }
    } else {
        res.status(404).send('Page not found');
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API Key Loaded: ${!!process.env.GEMINI_API_KEY}`);
});