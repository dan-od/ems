const express = require('express');
const { authenticateJWT } = require('../../middleware/auth');
const pool = require('../../config/db');
const router = express.Router();

// Get requests created by the logged-in user (personal history) - FIXED PATH
router.get('/my/list', authenticateJWT(), async (req, res) => {
  try {
    console.log('👤 Fetching personal requests for user:', req.user);

    const { rows } = await pool.query(`
      SELECT 
        r.*,
        u1.name as requested_by_name,
        u2.name as approved_by_name,
        d.name  as department_name,
        td.name as transferred_to_department_name,
        ut.name as transferred_by_name,
        CASE 
          WHEN r.is_new_equipment THEN r.new_equipment_name 
          ELSE e.name 
        END as equipment_name
      FROM requests r
      LEFT JOIN users u1 ON r.requested_by = u1.id
      LEFT JOIN users u2 ON r.approved_by = u2.id
      LEFT JOIN departments d  ON r.department_id = d.id
      LEFT JOIN departments td ON r.transferred_to_department = td.id
      LEFT JOIN users ut ON r.transferred_by = ut.id
      LEFT JOIN equipment e ON r.equipment_id = e.id
      WHERE r.requested_by = $1
      ORDER BY r.created_at DESC
    `, [req.user.id])

    res.json(rows);
  } catch (err) {
    console.error('❌ Fetch my requests error:', err);
    res.status(500).json({ error: 'Failed to fetch your requests' });
  }
});

module.exports = router;