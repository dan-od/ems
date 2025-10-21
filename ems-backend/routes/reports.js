// ems-backend/routes/reports.js
// RENAMED PURPOSE: Department activity reports (from request_approvals table)
// Does NOT handle maintenance logs - that's in maintenance.js

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateJWT, checkRole } = require('../middleware/auth');

/**
 * @route   GET /api/reports/department-activity
 * @desc    Get department activity report for managers (approvals, rejections, transfers)
 * @access  Manager, Admin, Staff
 * 
 * This uses the request_approvals audit table, NOT maintenance_logs
 */
router.get('/department-activity', authenticateJWT(), checkRole(['manager', 'admin', 'staff']), async (req, res) => {
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

    console.log(`\n📊 [REPORTS] Fetching department activity for dept #${departmentId}`);

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

    console.log(`   ✅ Returning ${rows.length} department activities`);

    res.json(rows);
  } catch (err) {
    console.error('❌ Fetch department activity error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch department activity', 
      details: err.message 
    });
  }
});

/**
 * @route   GET /api/reports/summary
 * @desc    Get summary statistics for reports dashboard
 * @access  Manager, Admin
 */
router.get('/summary', authenticateJWT(), checkRole(['manager', 'admin']), async (req, res) => {
  try {
    const { department_id, role } = req.user;

    let whereClause = '1=1';
    const params = [];

    if (role !== 'admin' && department_id) {
      whereClause = 'r.department_id = $1';
      params.push(department_id);
    }

    const { rows } = await pool.query(`
      SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN r.status = 'Pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN r.status = 'Approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN r.status = 'Rejected' THEN 1 END) as rejected_count,
        COUNT(CASE WHEN r.status = 'Transferred' THEN 1 END) as transferred_count,
        COUNT(CASE WHEN r.created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as this_month_count,
        COUNT(CASE WHEN r.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as this_week_count
      FROM requests r
      WHERE ${whereClause}
    `, params);

    res.json(rows[0] || {});
  } catch (err) {
    console.error('❌ Fetch summary error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch summary',
      details: err.message 
    });
  }
});

module.exports = router;