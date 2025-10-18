// backend/routes/contentRoutes.js
import { Router } from 'express';
import multer from 'multer';
import { generateContent } from '../controllers/contentController.js'; // Must use .js extension
import fs from 'fs';

const router = Router();

// Configure Multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); 
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Ensure the 'uploads' directory exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// POST /api/content/generate
router.post('/generate', upload.single('pdf'), generateContent);

export default router; // Exporting the router instance