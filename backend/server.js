// backend/server.js
import 'dotenv/config'; // ESM way to load .env variables
import express from 'express';
import contentRoutes from './routes/contentRoutes.js'; // Must use .js extension
import path from 'path';
import { fileURLToPath } from 'url';

// ESM equivalent of __dirname and __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup
app.use(express.static(path.join(__dirname, '..', 'frontend', 'src')));
app.use(express.json());

// Content generation routes
app.use('/api/content', contentRoutes);

// Simple root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'src', 'pages', 'content-generation.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API Key Loaded: ${!!process.env.GEMINI_API_KEY}`);
});