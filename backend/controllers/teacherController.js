import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
// Create a local Pool using environment variables (no external db.js file required)
import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const teacherLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password.' });
        }

        // Get teacher from database
        const result = await pool.query('SELECT * FROM teachers WHERE email = $1', [email]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const teacher = result.rows[0];

        // Verify password
        const validPassword = await bcrypt.compare(password, teacher.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Create JWT token
        const token = jwt.sign(
            { id: teacher.id, email: teacher.email, role: 'teacher' },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '1d' }
        );

        res.json({
            token,
            teacher: {
                id: teacher.id,
                name: teacher.name,
                email: teacher.email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
// Only teacherLogin is exported from this controller per request