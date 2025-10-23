// backend/controllers/adminController.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
// Create a local Pool using environment variables (no external db.js file required)
import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Admin login - ESM export
export const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password.' });
        }

        // Get admin from database (expects `email` column)
        const result = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const admin = result.rows[0];

        // Verify password
        const validPassword = await bcrypt.compare(password, admin.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Create JWT token
        const token = jwt.sign(
            { id: admin.id, email: admin.email, role: 'admin' },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '1d' }
        );

        res.json({
            token,
            admin: {
                id: admin.id,
                name: admin.name || admin.username,
                email: admin.email
            }
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};