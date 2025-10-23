// backend/routes/adminRoutes.js (ESM)
import express from 'express';
import multer from 'multer';
import { adminLogin } from '../controllers/adminController.js';
import { uploadTeachersCsv } from '../controllers/teacherUploadController.js';

const router = express.Router();

// Configure Multer for CSV upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// POST /api/auth/admin/login
router.post('/admin/login', adminLogin);

// POST /api/teachers/upload - CSV upload for teachers
router.post('/teachers/upload', upload.single('csvFile'), uploadTeachersCsv);

export default router;
