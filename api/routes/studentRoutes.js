// src/routes/studentRoutes.js
const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');

// Route to get all students
// GET /api/students
router.get('/', studentController.getAllStudents);

module.exports = router;