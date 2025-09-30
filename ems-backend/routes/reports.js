const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateJWT, checkRole } = require('../middleware/auth');  // ✅ Add checkRole here

// Get all reports
router.get('/', authenticateJWT(), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.id,
        r.date,
        r.type,
        r.description,
        r.status,
        COALESCE(u.name, 'Unknown') as user
      FROM reports r
      LEFT JOIN users u ON r.user_id = u.id
      ORDER BY r.date DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ message: 'Error fetching reports', error: error.message });
  }
});

// Get reports by date range
router.get('/filter', authenticateJWT(), async (req, res) => {
  const { startDate, endDate, type } = req.query;
  
  try {
    let query = `
      SELECT 
        r.id,
        r.date,
        r.type,
        r.description,
        r.status,
        COALESCE(u.name, 'Unknown') as user
      FROM reports r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;

    if (startDate) {
      query += ` AND r.date >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      query += ` AND r.date <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    if (type) {
      query += ` AND r.type = $${paramCount}`;
      params.push(type);
    }

    query += ` ORDER BY r.date DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error filtering reports:', error);
    res.status(500).json({ message: 'Error filtering reports', error: error.message });
  }
});

// Get department activity report for managers
router.get('/department-activity', authenticateJWT(), checkRole(['manager', 'admin']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let departmentId = req.user.department_id;

    // Admin can optionally query specific department
    if (req.user.role === 'admin' && req.query.deptId) {
      departmentId = Number(req.query.deptId);
    }

    if (!departmentId) {
      return res.status(400).json({ error: 'Department not specified' });
    }

    // Build date filter
    let dateFilter = '';
    const params = [departmentId];
    let paramCount = 2;

    if (startDate) {
      dateFilter += ` AND ra.created_at >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      dateFilter += ` AND ra.created_at <= $${paramCount}`;
      params.push(endDate);
    }

    // Get all department activity from request_approvals table
    const { rows } = await pool.query(`
      SELECT 
        ra.created_at as date,
        ra.status,
        ra.notes,
        r.id as request_id,
        r.subject,
        r.request_type as type,
        r.priority,
        u_requester.name as requested_by,
        u_approver.name as action_by,
        d_origin.name as origin_department,
        d_target.name as target_department,
        CASE 
          WHEN ra.status = 'approved' THEN 'Approval'
          WHEN ra.status = 'rejected' THEN 'Rejection'
          WHEN ra.status = 'transferred' AND r.department_id = $1 THEN 'Transfer Received'
          WHEN ra.status = 'transferred' AND r.transferred_to_department = $1 THEN 'Transfer Sent'
          ELSE ra.status
        END as activity_type
      FROM request_approvals ra
      JOIN requests r ON ra.request_id = r.id
      LEFT JOIN users u_requester ON r.requested_by = u_requester.id
      LEFT JOIN users u_approver ON ra.approved_by = u_approver.id
      LEFT JOIN departments d_origin ON r.department_id = d_origin.id
      LEFT JOIN departments d_target ON r.transferred_to_department = d_target.id
      WHERE (ra.department_id = $1 OR r.transferred_to_department = $1)
        ${dateFilter}
      ORDER BY ra.created_at DESC
      LIMIT 100
    `, params);

    res.json(rows);
  } catch (err) {
    console.error('❌ Fetch department activity error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch department activity', 
      details: err.message 
    });
  }
});


module.exports = router; 