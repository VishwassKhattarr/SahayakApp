// backend/routes/adminRoutes.js
import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { addSingleTeacher } from '../controllers/teacherUploadController.js';
import { getAllTeachers } from '../controllers/teacherController.js';
import { toggleTeacherStatus } from '../controllers/teacherController.js';
import { assignTeacher } from '../controllers/teacherController.js';
import { getAllClasses } from '../controllers/classController.js';
import { getAllSections } from '../controllers/sectionController.js';
import { getAllSubjects } from '../controllers/subjectController.js';
import { getAllYears } from '../controllers/yearController.js';
import { uploadStudentsCsv } from '../controllers/studentUploadController.js';
import { getAllStudents } from '../controllers/studentController.js';
import { uploadTeachersCsv } from '../controllers/teacherUploadController.js';




import { adminLogin } from '../controllers/adminController.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, '../uploads');

// ✅ Ensure uploads directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ✅ Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

router.get('/teachers', getAllTeachers);

router.get('/classes', getAllClasses);
router.get('/sections', getAllSections);
router.get('/subjects', getAllSubjects);
router.get('/academic_years', getAllYears);
router.get('/students', getAllStudents);

// 🔐 Admin login route
router.post('/admin/login', adminLogin);
router.post('/students/upload', upload.single('csvFile'), uploadStudentsCsv);


// 📤 Teacher CSV upload route
router.post('/teachers/upload', upload.single('csvFile'), uploadTeachersCsv);

//toggle active status
router.put('/teachers/:id/status', toggleTeacherStatus);

// POST /api/teachers/add - Add a single teacher


router.post('/teachers/add', addSingleTeacher);

router.post('/teachers/assign', assignTeacher);


export default router;
