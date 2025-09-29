const express = require('express');
const { authenticateJWT } = require('../middleware/auth');
const pool = require('../config/db');
const router = express.Router();

// Approve/deny request (Manager/Admin)
router.patch('/:id', authenticateJWT(['manager', 'admin']), async (req, res) => {
  const { is_approved } = req.body;
  const { rows } = await pool.query(
    `UPDATE assignments SET 
     is_approved = $1, 
     approved_by = $2,
     approved_at = NOW()
     WHERE id = $3 RETURNING *`,
    [is_approved, req.user.id, req.params.id]
  );
  res.json(rows[0]);
});

// routes/assignments.js
router.get('/', authenticateJWT(), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.*, e.name as equipment_name, u.name as user_name, f.name as field_name
      FROM assignments a
      LEFT JOIN equipment e ON a.equipment_id = e.id
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN fields f ON a.field_id = f.id
      ORDER BY a.assigned_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

router.post('/', authenticateJWT(), async (req, res) => {
  const { equipment_id, field_id, user_id } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO assignments (equipment_id, field_id, user_id, assigned_at)
       VALUES ($1, $2, $3, NOW()) RETURNING *`,
      [equipment_id, field_id, user_id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});


module.exports = router;