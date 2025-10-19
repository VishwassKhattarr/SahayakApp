// backend/server.js

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './config/db.js';

// Test database connection
pool.connect()
    .then(client => {
        console.log('Connected to Neon PostgreSQL database');
        client.release();
    })
    .catch(err => {
        console.error('Error connecting to the database:', err);
    });

// Import your custom routes
import contentRoutes from './routes/contentRoutes.js';
import authRoutes from './routes/authRoutes.js';

// --- Basic Setup ---
dotenv.config(); // Load environment variables from .env file
const app = express();
const PORT = process.env.PORT || 3000;

// Helper to get __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Middleware ---
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Static File Serving ---
// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve assets like CSS and JS from their specific paths within 'src'
app.use('/src', express.static(path.join(__dirname, '../frontend/src')));

// ✅ 1. Serve index.html from the 'public' folder for the root URL ('/')
app.use(express.static(path.join(__dirname, '../frontend/public')));

// ✅ 2. Serve all other pages from 'src/pages', resolving the .html extension
app.use(express.static(path.join(__dirname, '../frontend/src/pages'), {
    extensions: ['html']
}));


// --- API Routes ---
app.get('/api', (req, res) => {
  res.send('SahayakApp Backend is running!');
});

app.use('/api/content', contentRoutes);
app.use('/api/auth', authRoutes);

// --- Server Startup ---
app.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});