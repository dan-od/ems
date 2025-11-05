// ems-backend/routes/activityLogs.js
// Activity Log & Notification Center - Role-Based Access

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateJWT, checkRole } = require('../middleware/auth');

/**
 * @route   GET /api/activity-logs
 * @desc    Get activity logs with role-based filtering
 * @access  All authenticated users
 * 
 * ACCESS RULES:
 * - Engineer/Staff: Only their own activities
 * - Manager: Department activities OR specific team member (if view_user_id provided)
 * - Admin: All activities OR specific user (if view_user_id provided)
 */
router.get('/', authenticateJWT(), async (req, res) => {
  try {
    const { role, id: userId } = req.user;
    const { limit = 50, offset = 0, view_user_id } = req.query;

    let query;
    let params = [limit, offset];

    // For engineers and staff, only show their own activities
    if (role === 'engineer' || role === 'staff') {
      query = `
        SELECT 
          al.*,
          u.name as user_name,
          d.name as department_name
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        LEFT JOIN departments d ON al.department_id = d.id
        WHERE al.user_id = $3
        ORDER BY al.created_at DESC
        LIMIT $1 OFFSET $2
      `;
      params.push(userId);
    } else if (role === 'manager') {
      // Managers see department activities
      const deptResult = await pool.query(
        'SELECT department_id FROM users WHERE id = $1',
        [userId]
      );
      const deptId = deptResult.rows[0]?.department_id;

      query = `
        SELECT 
          al.*,
          u.name as user_name,
          d.name as department_name
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        LEFT JOIN departments d ON al.department_id = d.id
        WHERE al.department_id = $3
        ORDER BY al.created_at DESC
        LIMIT $1 OFFSET $2
      `;
      params.push(deptId);
    } else {
      // Admin sees all
      query = `
        SELECT 
          al.*,
          u.name as user_name,
          d.name as department_name
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        LEFT JOIN departments d ON al.department_id = d.id
        ORDER BY al.created_at DESC
        LIMIT $1 OFFSET $2
      `;
    }

    const result = await pool.query(query, params);

    res.json({
      activities: result.rows,
      total: result.rows.length,
      limit,
      offset
    });
  } catch (err) {
    console.error('Failed to fetch activity logs:', err);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

/**
 * @route   GET /api/activity-logs/stats
 * @desc    Get activity statistics (role-scoped)
 * @access  All authenticated users
 */
router.get('/stats', authenticateJWT(), async (req, res) => {
  try {
    const { role, id: userId, department_id } = req.user;
    const { view_user_id } = req.query;

    let whereClause = '1=1';
    const params = [];
    let paramIndex = 1;

    // Apply same filtering logic as main route
    if (role === 'engineer' || role === 'staff') {
      whereClause = `user_id = $${paramIndex}`;
      params.push(userId);
    } else if (role === 'manager') {
      if (view_user_id) {
        whereClause = `user_id = $${paramIndex}`;
        params.push(view_user_id);
      } else {
        whereClause = `department_id = $${paramIndex}`;
        params.push(department_id);
      }
    } else if (role === 'admin' && view_user_id) {
      whereClause = `user_id = $${paramIndex}`;
      params.push(view_user_id);
    }

    const statsQuery = `
      SELECT 
        COUNT(*) as total_activities,
        COUNT(CASE WHEN action_type LIKE '%report%' THEN 1 END) as report_activities,
        COUNT(CASE WHEN action_type LIKE '%request%' THEN 1 END) as request_activities,
        COUNT(CASE WHEN action_type LIKE '%equipment%' THEN 1 END) as equipment_activities,
        COUNT(CASE WHEN action_type LIKE '%approved%' THEN 1 END) as approvals_received,
        COUNT(CASE WHEN action_type LIKE '%rejected%' THEN 1 END) as rejections_received,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as this_week,
        COUNT(CASE WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as this_month,
        COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as today
      FROM activity_logs
      WHERE ${whereClause}
    `;

    const { rows } = await pool.query(statsQuery, params);
    res.json(rows[0] || {
      total_activities: 0,
      report_activities: 0,
      request_activities: 0,
      equipment_activities: 0,
      approvals_received: 0,
      rejections_received: 0,
      this_week: 0,
      this_month: 0,
      today: 0
    });

  } catch (err) {
    console.error('❌ Get activity stats error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch stats',
      details: err.message 
    });
  }
});

/**
 * @route   GET /api/activity-logs/department-users
 * @desc    Get list of users in department (Manager) or all users (Admin)
 * @access  Manager, Admin
 * 
 * This powers the "View activity for" dropdown
 */
router.get('/department-users', authenticateJWT(), checkRole(['manager', 'admin']), async (req, res) => {
  try {
    const { role, department_id } = req.user;

    let query = `
      SELECT 
        u.id,
        u.name,
        u.role,
        u.email,
        d.name as department_name,
        COUNT(al.id) as activity_count,
        MAX(al.created_at) as last_activity
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN activity_logs al ON u.id = al.user_id
      WHERE u.email != 'deleted@system.local'
    `;

    const params = [];
    if (role === 'manager') {
      // Manager: Only their department users
      if (!department_id) {
        return res.status(400).json({ error: 'Department ID missing' });
      }
      query += ` AND u.department_id = $1`;
      params.push(department_id);
    }
    // Admin: No filter, see all users

    query += `
      GROUP BY u.id, u.name, u.role, u.email, d.name
      ORDER BY u.name
    `;

    const { rows } = await pool.query(query, params);
    
    console.log(`✓ [ACTIVITY LOGS] Returning ${rows.length} users for ${role}`);
    
    res.json(rows);

  } catch (err) {
    console.error('❌ Get department users error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch users',
      details: err.message 
    });
  }
});

/**
 * @route   GET /api/activity-logs/action-types
 * @desc    Get list of available action types for filtering
 * @access  All authenticated users
 */
router.get('/action-types', authenticateJWT(), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT action_type, COUNT(*) as count
      FROM activity_logs
      GROUP BY action_type
      ORDER BY action_type
    `);

    res.json(rows);

  } catch (err) {
    console.error('❌ Get action types error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch action types',
      details: err.message 
    });
  }
});

module.exports = router;