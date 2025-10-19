// src/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Route for admin login
// POST /api/admin/login
router.post('/login', adminController.login);

// Optional: A route to register a new admin (for setup)
// POST /api/admin/register
router.post('/register', adminController.register);

module.exports = router;