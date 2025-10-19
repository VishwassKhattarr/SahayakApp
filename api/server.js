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
// Configure CORS with specific options
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5000'], // Allow both backend and frontend origins
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json()); // To parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // To parse URL-encoded request bodies

// --- Static File Serving ---
// Serve the files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve assets like CSS and JS from their specific paths within the 'src' directory
app.use('/src', express.static(path.join(__dirname, '../frontend/src')));

// Serve the HTML pages from 'frontend/src/pages' as the main/root directory
// ✅ INCLUDED FIX: This now automatically resolves '.html' extensions for clean URLs.
app.use(express.static(path.join(__dirname, '../frontend/src/pages'), {
    extensions: ['html']
}));


// --- API Routes ---
// A simple test route to check if the server is up
app.get('/api', (req, res) => {
  res.send('SahayakApp Backend is running!');
});

// Mount your routes under the '/api' prefix
app.use('/api/content', contentRoutes);
app.use('/api/auth', authRoutes);

// --- Server Startup ---
app.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});