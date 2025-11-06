// ems-backend/routes/stats/managerStats.js
const express = require('express');
const { authenticateJWT, checkRole } = require('../../middleware/auth');
const pool = require('../../config/db');
const router = express.Router();

console.log('📊 [MANAGER STATS] Loading manager stats routes...');

/**
 * GET /api/stats/manager-dashboard
 * Comprehensive dashboard data for managers
 */
router.get('/manager-dashboard', authenticateJWT(), checkRole(['manager', 'admin']), async (req, res) => {
  console.log('\n📊 [MANAGER DASHBOARD] Fetching complete dashboard data');
  console.log('👤 User:', { id: req.user.id, role: req.user.role, dept: req.user.department_id });

  try {
    const departmentId = req.user.department_id;

    if (!departmentId) {
      return res.status(400).json({
        success: false,
        error: 'No department assigned to user'
      });
    }

    // Initialize empty response
    const dashboardData = {
      stats: {
        pendingApprovals: 0,
        teamActiveJobs: 0,
        deptEquipmentAssigned: 0,
        monthCompleted: 0
      },
      approvalQueue: [],
      teamMembers: [],
      crossDeptTransfers: {
        incoming: [],
        outgoing: []
      },
      performance: {
        approvedCount: 0,
        rejectedCount: 0,
        completedCount: 0,
        avgApprovalTime: 0,
        totalRequests: 0,
        completionRate: 0
      }
    };

    // ============================================
    // 1. APPROVAL QUEUE (Most Important)
    // ============================================
    try {
      const approvalQueueQuery = `
        SELECT 
          r.*,
          u.name as requested_by_name,
          u.email as requested_by_email,
          u.role as requester_role,
          d.name as department_name,
          EXTRACT(EPOCH FROM (NOW() - r.created_at))/3600 as hours_pending
        FROM requests r
        LEFT JOIN users u ON r.requested_by = u.id
        LEFT JOIN departments d ON d.id = $1
        WHERE r.status = 'Pending'
        ORDER BY 
          CASE r.priority
            WHEN 'Urgent' THEN 1
            WHEN 'High' THEN 2
            WHEN 'Medium' THEN 3
            WHEN 'Low' THEN 4
          END,
          r.created_at ASC
        LIMIT 10
      `;

      const approvalQueueResult = await pool.query(approvalQueueQuery, [departmentId]);
      dashboardData.approvalQueue = approvalQueueResult.rows;
      dashboardData.stats.pendingApprovals = approvalQueueResult.rows.length;
      console.log('✅ Approval queue:', approvalQueueResult.rows.length, 'requests');
    } catch (err) {
      console.error('❌ Approval queue error:', err.message);
    }

    // ============================================
    // 2. TEAM MEMBERS
    // ============================================
    try {
      const teamQuery = `
        SELECT 
          u.id,
          u.name,
          u.email,
          u.role,
          0 as active_requests,
          0 as assigned_equipment
        FROM users u
        WHERE u.department_id = $1
          AND u.role IN ('engineer', 'staff')
        ORDER BY u.name
      `;

      const teamResult = await pool.query(teamQuery, [departmentId]);
      dashboardData.teamMembers = teamResult.rows;
      console.log('✅ Team members:', teamResult.rows.length);
    } catch (err) {
      console.error('❌ Team members error:', err.message);
    }

    // ============================================
    // 3. EQUIPMENT COUNT
    // ============================================
    try {
      const equipmentQuery = `
        SELECT COUNT(*) as count
        FROM equipment
        WHERE department_id = $1
        AND status IN ('available', 'in_use')
      `;

      const equipmentResult = await pool.query(equipmentQuery, [departmentId]);
      dashboardData.stats.deptEquipmentAssigned = parseInt(equipmentResult.rows[0].count) || 0;
      console.log('✅ Equipment count:', dashboardData.stats.deptEquipmentAssigned);
    } catch (err) {
      console.error('❌ Equipment count error:', err.message);
    }

    // ============================================
    // 4. CROSS-DEPARTMENT TRANSFERS (if transferred_to_department exists)
    // ============================================
    try {
      // First check if transferred_to_department column exists
      const columnCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'requests' 
        AND column_name = 'transferred_to_department'
      `);

      if (columnCheck.rows.length > 0) {
        const transfersQuery = `
          SELECT 
            r.*,
            d1.name as origin_dept_name,
            d2.name as target_dept_name,
            u1.name as transferred_by_name,
            u2.name as requested_by_name
          FROM requests r
          LEFT JOIN departments d1 ON d1.id = $1
          LEFT JOIN departments d2 ON r.transferred_to_department = d2.id
          LEFT JOIN users u1 ON r.transferred_by = u1.id
          LEFT JOIN users u2 ON r.requested_by = u2.id
          WHERE 
            r.transferred_at IS NOT NULL
            AND r.transferred_to_department = $1
            AND DATE(r.transferred_at) >= CURRENT_DATE - INTERVAL '7 days'
          ORDER BY r.transferred_at DESC
          LIMIT 20
        `;

        const transfersResult = await pool.query(transfersQuery, [departmentId]);
        dashboardData.crossDeptTransfers.incoming = transfersResult.rows;
        console.log('✅ Cross-dept transfers:', transfersResult.rows.length);
      }
    } catch (err) {
      console.error('❌ Cross-dept transfers error:', err.message);
    }

    // ============================================
    // 5. PERFORMANCE METRICS (Basic)
    // ============================================
    try {
      const performanceQuery = `
        SELECT 
          COUNT(*) FILTER (WHERE status = 'Approved') as approved_week,
          COUNT(*) FILTER (WHERE status = 'Rejected') as rejected_week,
          COUNT(*) FILTER (WHERE status = 'Completed' AND completed_at IS NOT NULL) as completed_week,
          COUNT(*) as total_requests
        FROM requests
        WHERE DATE(created_at) >= CURRENT_DATE - INTERVAL '7 days'
      `;

      const performanceResult = await pool.query(performanceQuery);
      const perf = performanceResult.rows[0];
      
      dashboardData.performance = {
        approvedCount: parseInt(perf.approved_week) || 0,
        rejectedCount: parseInt(perf.rejected_week) || 0,
        completedCount: parseInt(perf.completed_week) || 0,
        avgApprovalTime: 0,
        totalRequests: parseInt(perf.total_requests) || 0,
        completionRate: 0
      };
      console.log('✅ Performance metrics:', dashboardData.performance);
    } catch (err) {
      console.error('❌ Performance metrics error:', err.message);
    }

    console.log('✅ Dashboard data compiled successfully');

    res.json(dashboardData);

  } catch (error) {
    console.error('❌ Error fetching manager dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

console.log('✅ [MANAGER STATS] Manager stats routes loaded\n');

module.exports = router;