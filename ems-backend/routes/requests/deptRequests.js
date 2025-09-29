const express = require('express');
const { authenticateJWT, checkRole } = require('../../middleware/auth');
const pool = require('../../config/db');
const router = express.Router();

// Get requests for the manager/admin's department - FIXED PATH
router.get('/department/requests', authenticateJWT(), checkRole(['manager', 'admin']), async (req, res) => {
  try {
    console.log('👤 Fetching department requests for user:', req.user);

    let departmentId = req.user.department_id;
    if (req.user.role === 'admin' && req.query.deptId) {
      departmentId = Number(req.query.deptId);
    }

    if (!departmentId) {
      return res.status(400).json({ error: 'Department not specified or assigned' });
    }

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
      WHERE r.department_id = $1
        AND r.status IN ('Pending','Transferred')
      ORDER BY 
        CASE r.priority
          WHEN 'Urgent' THEN 1
          WHEN 'High'   THEN 2
          WHEN 'Medium' THEN 3
          WHEN 'Low'    THEN 4
        END,
        r.created_at DESC
    `, [departmentId]);

    res.json(rows);
  } catch (err) {
    console.error('❌ Fetch department requests error:', err);
    res.status(500).json({ error: 'Failed to fetch department requests' });
  }
});

module.exports = router;