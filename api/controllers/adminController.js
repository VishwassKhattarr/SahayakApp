// src/controllers/adminController.js
const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// --- Register a New Admin (for initial setup) ---
exports.register = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Please provide username and password.' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const query = 'INSERT INTO admins (username, password) VALUES ($1, $2) RETURNING id, username';
        const { rows } = await pool.query(query, [username, hashedPassword]);

        res.status(201).json({ message: 'Admin created successfully', admin: rows[0] });

    } catch (error) {
        console.error('Admin registration error:', error);
        if (error.code === '23505') { // Unique constraint violation
            return res.status(409).json({ message: 'Admin with this username already exists.' });
        }
        res.status(500).json({ message: 'Server error during registration.' });
    }
};


// --- Admin Login ---
exports.login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Please provide both username and password.' });
    }

    try {
        const query = 'SELECT * FROM admins WHERE username = $1';
        const { rows } = await pool.query(query, [username]);

        const admin = rows[0];
        if (!admin) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        // Send success response that matches what the frontend expects
        res.status(200).json({ success: true, message: 'Admin login successful' });

    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ success: false, message: 'Server error during login.' });
    }
};