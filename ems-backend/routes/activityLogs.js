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
    const { role, id: userId, department_id } = req.user;
    const { 
      limit = 50, 
      offset = 0, 
      action_type,
      start_date,
      end_date,
      view_user_id // For managers/admin viewing specific user
    } = req.query;

    console.log(`\n📋 [ACTIVITY LOGS] User #${userId} (${role}) requesting logs`);

    let query = `
      SELECT 
        al.*,
        CASE 
          WHEN al.action_type LIKE '%report%' THEN '📋'
          WHEN al.action_type LIKE '%equipment%' THEN '🔧'
          WHEN al.action_type LIKE '%request%' THEN '📦'
          WHEN al.action_type LIKE '%approved%' THEN '✅'
          WHEN al.action_type LIKE '%rejected%' THEN '❌'
          WHEN al.action_type LIKE '%login%' THEN '🔐'
          WHEN al.action_type LIKE '%maintenance%' THEN '🛠️'
          ELSE '📝'
        END as icon
      FROM activity_logs al
      WHERE 1=1
    `;

    const queryParams = [];
    let paramIndex = 1;

    // ROLE-BASED FILTERING
    if (role === 'engineer' || role === 'staff') {
      // Engineers/Staff: Only their own activities
      query += ` AND al.user_id = $${paramIndex}`;
      queryParams.push(userId);
      paramIndex++;
      console.log(`   ✓ Filtered to own activities only`);
      
    } else if (role === 'manager') {
      // Manager: Their department OR specific team member
      if (view_user_id) {
        // Verify the user belongs to manager's department
        const userCheck = await pool.query(
          'SELECT department_id, name FROM users WHERE id = $1',
          [view_user_id]
        );
        
        if (userCheck.rows.length === 0) {
          return res.status(404).json({ error: 'User not found' });
        }
        
        if (userCheck.rows[0].department_id !== department_id) {
          return res.status(403).json({ 
            error: 'Cannot view activities of users from other departments' 
          });
        }
        
        query += ` AND al.user_id = $${paramIndex}`;
        queryParams.push(view_user_id);
        paramIndex++;
        console.log(`   ✓ Viewing specific user: ${userCheck.rows[0].name}`);
      } else {
        // Show all department activity
        if (!department_id) {
          return res.status(400).json({ error: 'Department ID missing' });
        }
        query += ` AND al.department_id = $${paramIndex}`;
        queryParams.push(department_id);
        paramIndex++;
        console.log(`   ✓ Viewing department #${department_id} activities`);
      }
      
    } else if (role === 'admin') {
      // Admin: Everything OR specific user
      if (view_user_id) {
        query += ` AND al.user_id = $${paramIndex}`;
        queryParams.push(view_user_id);
        paramIndex++;
        console.log(`   ✓ Admin viewing specific user #${view_user_id}`);
      } else {
        console.log(`   ✓ Admin viewing all system activities`);
      }
      // No filter = see all
    }

    // ADDITIONAL FILTERS
    if (action_type) {
      query += ` AND al.action_type = $${paramIndex}`;
      queryParams.push(action_type);
      paramIndex++;
    }

    if (start_date) {
      query += ` AND al.created_at >= $${paramIndex}`;
      queryParams.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      query += ` AND al.created_at <= $${paramIndex}`;
      queryParams.push(end_date);
      paramIndex++;
    }

    // ORDER AND PAGINATION
    query += ` ORDER BY al.created_at DESC`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(parseInt(limit), parseInt(offset));

    const { rows } = await pool.query(query, queryParams);

    // GET TOTAL COUNT (with same filters)
    let countQuery = `SELECT COUNT(*) FROM activity_logs al WHERE 1=1`;
    const countParams = [];
    let countIndex = 1;

    if (role === 'engineer' || role === 'staff') {
      countQuery += ` AND al.user_id = $${countIndex}`;
      countParams.push(userId);
      countIndex++;
    } else if (role === 'manager') {
      if (view_user_id) {
        countQuery += ` AND al.user_id = $${countIndex}`;
        countParams.push(view_user_id);
        countIndex++;
      } else {
        countQuery += ` AND al.department_id = $${countIndex}`;
        countParams.push(department_id);
        countIndex++;
      }
    } else if (role === 'admin' && view_user_id) {
      countQuery += ` AND al.user_id = $${countIndex}`;
      countParams.push(view_user_id);
      countIndex++;
    }

    if (action_type) {
      countQuery += ` AND al.action_type = $${countIndex}`;
      countParams.push(action_type);
      countIndex++;
    }

    if (start_date) {
      countQuery += ` AND al.created_at >= $${countIndex}`;
      countParams.push(start_date);
      countIndex++;
    }

    if (end_date) {
      countQuery += ` AND al.created_at <= $${countIndex}`;
      countParams.push(end_date);
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    console.log(`   ✓ Returning ${rows.length} logs (total: ${totalCount})`);

    res.json({
      logs: rows,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + rows.length < totalCount
      },
      userRole: role,
      viewingUserId: view_user_id || null
    });

  } catch (err) {
    console.error('❌ Get activity logs error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch activity logs',
      details: err.message 
    });
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