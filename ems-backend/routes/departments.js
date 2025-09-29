const express = require('express');
const { authenticateJWT, checkRole } = require('../middleware/auth');
const pool = require('../config/db');
const router = express.Router();

// Get all departments
router.get('/', authenticateJWT(), async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM departments ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    console.error('Get departments error:', err);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// Create new department (Admin only)
router.post('/', authenticateJWT(), checkRole(['admin']), async (req, res) => {
  const { name, description } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO departments (name, description)
       VALUES ($1, $2) RETURNING *`,
      [name, description]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create department error:', err);
    res.status(500).json({ error: 'Failed to create department' });
  }
});

module.exports = router;
