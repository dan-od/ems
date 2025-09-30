const express = require('express');
const { authenticateJWT, checkRole } = require('../../middleware/auth');
const pool = require('../../config/db');
const router = express.Router();

// ==================== DEPARTMENT REQUEST QUERIES ====================
// These routes are directly at /requests/department/...

/**
 * Get requests for a specific department
 * @route GET /requests/department/requests
 * @query deptId (optional, admin only)
 * @access Manager, Admin
 */
router.get('/department/requests', authenticateJWT(), checkRole(['manager', 'admin']), async (req, res) => {
  console.log('\n📋 [DEPT REQUESTS] Fetching department requests');
  console.log('👤 User:', { id: req.user.id, role: req.user.role, dept: req.user.department_id });

  try {
    let departmentId = req.user.department_id;

    // Admin can optionally query specific department
    if (req.user.role === 'admin' && req.query.deptId) {
      departmentId = Number(req.query.deptId);
      console.log(`🔍 Admin querying Department #${departmentId}`);
    }

    if (!departmentId) {
      return res.status(400).json({ 
        error: 'Department not specified or assigned' 
      });
    }

    // Fetch requests with full context
    const { rows } = await pool.query(`
      SELECT 
        r.*,
        u1.name AS requested_by_name,
        u2.name AS approved_by_name,
        d.name  AS department_name,
        td.name AS transferred_to_department_name,
        ut.name AS transferred_by_name,
        CASE 
          WHEN r.is_new_equipment THEN r.new_equipment_name 
          ELSE e.name 
        END AS equipment_name
      FROM requests r
      LEFT JOIN users u1 ON r.requested_by = u1.id
      LEFT JOIN users u2 ON r.approved_by = u2.id
      LEFT JOIN departments d  ON r.department_id = d.id
      LEFT JOIN departments td ON r.transferred_to_department = td.id
      LEFT JOIN users ut ON r.transferred_by = ut.id
      LEFT JOIN equipment e ON r.equipment_id = e.id
      WHERE r.department_id = $1
        AND r.status IN ('Pending', 'Transferred')
      ORDER BY 
        CASE r.priority
          WHEN 'Urgent' THEN 1
          WHEN 'High'   THEN 2
          WHEN 'Medium' THEN 3
          WHEN 'Low'    THEN 4
        END,
        r.created_at DESC
    `, [departmentId]);

    console.log(`✅ Found ${rows.length} pending/transferred requests for department #${departmentId}`);
    res.json(rows);
  } catch (err) {
    console.error('❌ Fetch department requests error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch department requests',
      details: err.message
    });
  }
});

/**
 * Get all requests (approved, rejected, completed) for a department
 * Useful for history/audit views
 * @route GET /requests/department/all
 * @query deptId (optional, admin only)
 * @access Manager, Admin
 */
router.get('/department/all', authenticateJWT(), checkRole(['manager', 'admin']), async (req, res) => {
  console.log('\n📚 [DEPT ALL REQUESTS] Fetching all requests (including history)');

  try {
    let departmentId = req.user.department_id;

    if (req.user.role === 'admin' && req.query.deptId) {
      departmentId = Number(req.query.deptId);
    }

    if (!departmentId) {
      return res.status(400).json({ 
        error: 'Department not specified or assigned' 
      });
    }

    const { rows } = await pool.query(`
      SELECT 
        r.*,
        u1.name AS requested_by_name,
        u2.name AS approved_by_name,
        d.name  AS department_name,
        td.name AS transferred_to_department_name,
        ut.name AS transferred_by_name,
        CASE 
          WHEN r.is_new_equipment THEN r.new_equipment_name 
          ELSE e.name 
        END AS equipment_name
      FROM requests r
      LEFT JOIN users u1 ON r.requested_by = u1.id
      LEFT JOIN users u2 ON r.approved_by = u2.id
      LEFT JOIN departments d  ON r.department_id = d.id
      LEFT JOIN departments td ON r.transferred_to_department = td.id
      LEFT JOIN users ut ON r.transferred_by = ut.id
      LEFT JOIN equipment e ON r.equipment_id = e.id
      WHERE r.department_id = $1
      ORDER BY r.created_at DESC
    `, [departmentId]);

    console.log(`✅ Found ${rows.length} total requests for department #${departmentId}`);
    res.json(rows);
  } catch (err) {
    console.error('❌ Fetch all department requests error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch all department requests',
      details: err.message
    });
  }
});

module.exports = router;