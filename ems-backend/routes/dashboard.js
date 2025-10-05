const express = require('express');
const { authenticateJWT, checkRole } = require('../middleware/auth');
const pool = require('../config/db');
const router = express.Router();

/**
 * @route   GET /api/dashboard/engineer-stats
 * @desc    Get personalized stats for engineer dashboard
 * @access  Engineer, Admin
 */
router.get('/engineer-stats', authenticateJWT(), async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await pool.query(`
      SELECT
        -- My active requests
        (SELECT COUNT(*) FROM requests WHERE requested_by = $1 AND status NOT IN ('Completed', 'Rejected')) as active_requests,
        
        -- My pending requests
        (SELECT COUNT(*) FROM requests WHERE requested_by = $1 AND status = 'Pending') as pending_requests,
        
        -- My assigned equipment
        (SELECT COUNT(*) FROM equipment_assignments WHERE assigned_to = $1 AND returned_at IS NULL) as assigned_equipment,
        
        -- Equipment needing attention
        (SELECT COUNT(*) 
         FROM equipment_assignments ea
         INNER JOIN equipment e ON ea.equipment_id = e.id
         WHERE ea.assigned_to = $1 
           AND ea.returned_at IS NULL
           AND e.status = 'Maintenance') as equipment_needing_attention,
        
        -- Completed requests this month
        (SELECT COUNT(*) 
         FROM requests 
         WHERE requested_by = $1 
           AND status = 'Completed'
           AND created_at >= DATE_TRUNC('month', CURRENT_DATE)) as completed_this_month
    `, [userId]);

    res.json(stats.rows[0]);
  } catch (err) {
    console.error('❌ Get engineer stats error:', err);
    res.status(500).json({ error: 'Failed to fetch engineer stats' });
  }
});

/**
 * @route   GET /api/dashboard/manager-stats
 * @desc    Get stats for manager dashboard
 * @access  Manager, Admin
 */
router.get('/manager-stats', 
  authenticateJWT(), 
  checkRole(['manager', 'admin']), 
  async (req, res) => {
    try {
      let departmentId = req.user.department_id;

      // Admin can query specific department
      if (req.user.role === 'admin' && req.query.deptId) {
        departmentId = parseInt(req.query.deptId);
      }

      if (!departmentId) {
        return res.status(400).json({ error: 'Department not specified' });
      }

      const stats = await pool.query(`
        SELECT
          -- Pending approvals
          (SELECT COUNT(*) FROM requests WHERE department_id = $1 AND status = 'Pending') as pending_approvals,
          
          -- Urgent approvals
          (SELECT COUNT(*) FROM requests WHERE department_id = $1 AND status = 'Pending' AND priority IN ('Urgent', 'High')) as urgent_approvals,
          
          -- Active jobs
          (SELECT COUNT(*) FROM requests WHERE department_id = $1 AND status = 'Approved') as active_jobs,
          
          -- Transferred out
          (SELECT COUNT(*) FROM requests WHERE department_id = $1 AND status = 'Transferred') as transferred_out,
          
          -- Completed this month
          (SELECT COUNT(*) FROM requests 
           WHERE department_id = $1 
             AND status = 'Completed'
             AND created_at >= DATE_TRUNC('month', CURRENT_DATE)) as completed_this_month,
          
          -- Team members count
          (SELECT COUNT(*) FROM users WHERE department_id = $1 AND role IN ('engineer', 'staff')) as team_members
      `, [departmentId]);

      res.json(stats.rows[0]);
    } catch (err) {
      console.error('❌ Get manager stats error:', err);
      res.status(500).json({ error: 'Failed to fetch manager stats' });
    }
});

/**
 * @route   GET /api/dashboard/admin-stats
 * @desc    Get system-wide stats for admin dashboard
 * @access  Admin only
 */
router.get('/admin-stats', 
  authenticateJWT(), 
  checkRole(['admin']), 
  async (req, res) => {
    try {
      const stats = await pool.query(`
        SELECT
          -- Total users
          (SELECT COUNT(*) FROM users WHERE email != 'deleted@system.local') as total_users,
          
          -- Active users (logged in last 7 days) - placeholder
          (SELECT COUNT(*) FROM users WHERE email != 'deleted@system.local') as active_users,
          
          -- Total requests
          (SELECT COUNT(*) FROM requests) as total_requests,
          
          -- Pending requests company-wide
          (SELECT COUNT(*) FROM requests WHERE status = 'Pending') as pending_requests,
          
          -- Total equipment
          (SELECT COUNT(*) FROM equipment WHERE status != 'Retired') as total_equipment,
          
          -- Equipment in maintenance
          (SELECT COUNT(*) FROM equipment WHERE status = 'Maintenance') as equipment_in_maintenance,
          
          -- Departments count
          (SELECT COUNT(*) FROM departments) as departments_count
      `);

      res.json(stats.rows[0]);
    } catch (err) {
      console.error('❌ Get admin stats error:', err);
      res.status(500).json({ error: 'Failed to fetch admin stats' });
    }
});

module.exports = router;