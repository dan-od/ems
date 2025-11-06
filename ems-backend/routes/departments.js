// ems-backend/routes/departments.js
const express = require('express');
const { authenticateJWT, checkRole } = require('../middleware/auth');
const pool = require('../config/db');
const router = express.Router();
const { logActivity, ACTION_TYPES, ENTITY_TYPES, extractUserInfo } = require('../utils/activityLogger');

console.log('🏢 [DEPARTMENTS] Loading department routes...');

// ============================================
// 🆕 STATS ENDPOINT FOR MANAGER DASHBOARD
// ============================================

/**
 * GET /api/departments/stats
 * Get department statistics for Manager Dashboard
 */
router.get('/stats', authenticateJWT(), checkRole(['manager', 'admin']), async (req, res) => {
  console.log('\n📊 [DEPT STATS] Fetching department statistics');
  console.log('👤 User:', { id: req.user.id, role: req.user.role, dept: req.user.department_id });
  
  try {
    const { departmentId } = req.query;

    if (!departmentId) {
      return res.status(400).json({
        success: false,
        message: 'Department ID is required'
      });
    }

    const query = `
      WITH today_stats AS (
        SELECT 
          COUNT(*) FILTER (
            WHERE status = 'Approved' 
            AND DATE(approved_at) = CURRENT_DATE
          ) as approved_today,
          COUNT(*) FILTER (
            WHERE status = 'Rejected' 
            AND DATE(approved_at) = CURRENT_DATE
          ) as rejected_today
        FROM requests
        WHERE department_id = $1
      ),
      pending_stats AS (
        SELECT COUNT(*) as pending_requests
        FROM requests
        WHERE department_id = $1 AND status = 'Pending'
      ),
      transfer_stats AS (
        SELECT 
          COUNT(*) FILTER (
            WHERE department_id = $1
          ) as transferred_out,
          COUNT(*) FILTER (
            WHERE transferred_to_department = $1
          ) as transferred_in
        FROM requests
        WHERE transferred_at IS NOT NULL
        AND DATE(transferred_at) >= CURRENT_DATE - INTERVAL '7 days'
      ),
      completion_stats AS (
        SELECT COUNT(*) as completed_week
        FROM requests
        WHERE department_id = $1 
        AND status = 'Completed'
        AND completed_at IS NOT NULL
        AND DATE(completed_at) >= CURRENT_DATE - INTERVAL '7 days'
      )
      SELECT 
        COALESCE((SELECT approved_today FROM today_stats), 0) as approved_today,
        COALESCE((SELECT rejected_today FROM today_stats), 0) as rejected_today,
        COALESCE((SELECT pending_requests FROM pending_stats), 0) as pending_requests,
        COALESCE((SELECT transferred_out FROM transfer_stats), 0) as transferred_out,
        COALESCE((SELECT transferred_in FROM transfer_stats), 0) as transferred_in,
        COALESCE((SELECT completed_week FROM completion_stats), 0) as completed_week
    `;

    const result = await pool.query(query, [departmentId]);

    console.log('✅ Stats fetched:', result.rows[0]);

    res.json({
      success: true,
      stats: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error fetching department stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch department statistics',
      error: error.message
    });
  }
});

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

// Get single department
router.get('/:id', authenticateJWT(), async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      'SELECT * FROM departments WHERE id = $1',
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Get department error:', err);
    res.status(500).json({ error: 'Failed to fetch department' });
  }
});

// Create new department (Admin only)
router.post('/', authenticateJWT(), checkRole(['admin']), async (req, res) => {
  const adminInfo = extractUserInfo(req);
  const { name, description } = req.body;
  
  try {
    const { rows } = await pool.query(
      `INSERT INTO departments (name, description)
       VALUES ($1, $2) RETURNING *`,
      [name, description]
    );
    
    const newDept = rows[0];
    
    // ✅ LOG DEPARTMENT CREATION
    await logActivity({
      ...adminInfo,
      actionType: ACTION_TYPES.DEPARTMENT_CREATED,
      entityType: ENTITY_TYPES.DEPARTMENT,
      entityId: newDept.id,
      entityName: newDept.name,
      description: `Created department: ${newDept.name}`,
      metadata: {
        description: newDept.description
      }
    });
    
    res.status(201).json(newDept);
  } catch (err) {
    console.error('❌ Create department error:', err);
    res.status(500).json({ error: 'Failed to create department' });
  }
});

console.log('✅ [DEPARTMENTS] Department routes loaded (including /stats)\n');

module.exports = router;