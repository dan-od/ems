// ems-backend/routes/stats/adminStats.js
const express = require('express');
const { authenticateJWT, checkRole } = require('../../middleware/auth');
const pool = require('../../config/db');
const router = express.Router();

/**
 * Admin Dashboard Stats
 * @route GET /api/stats/admin-dashboard
 * @access Admin only
 * 
 * Returns comprehensive system-wide data:
 * - System stats (users, requests, equipment, departments)
 * - Department comparison (performance across all departments)
 * - Recent activity (latest requests, approvals, equipment assignments)
 * - User breakdown (by role and department)
 * - Equipment utilization
 * - Pending approvals across system
 */
router.get('/admin-dashboard', 
  authenticateJWT(), 
  checkRole(['admin']), 
  async (req, res) => {
    try {
      console.log(`\n📊 [ADMIN DASHBOARD] Fetching system-wide stats`);

      // ==================== PARALLEL QUERIES FOR PERFORMANCE ====================
      const [
        systemStatsQuery,
        departmentStatsQuery,
        recentActivityQuery,
        userBreakdownQuery,
        equipmentUtilizationQuery,
        pendingApprovalsQuery,
        performanceMetricsQuery
      ] = await Promise.all([
        
        // 1. System-Wide Stats
        pool.query(`
          SELECT 
            -- User counts
            (SELECT COUNT(*) FROM users WHERE email != 'deleted@system.local') as total_users,
            (SELECT COUNT(*) FROM users WHERE role = 'engineer' AND email != 'deleted@system.local') as total_engineers,
            (SELECT COUNT(*) FROM users WHERE role = 'manager' AND email != 'deleted@system.local') as total_managers,
            (SELECT COUNT(*) FROM users WHERE role = 'staff' AND email != 'deleted@system.local') as total_staff,
            
            -- Request counts
            (SELECT COUNT(*) FROM requests) as total_requests,
            (SELECT COUNT(*) FROM requests WHERE status = 'Pending') as pending_requests,
            (SELECT COUNT(*) FROM requests WHERE status = 'Approved') as approved_requests,
            (SELECT COUNT(*) FROM requests WHERE status = 'Completed') as completed_requests,
            (SELECT COUNT(*) FROM requests WHERE status = 'Rejected') as rejected_requests,
            
            -- Equipment counts
            (SELECT COUNT(*) FROM equipment WHERE status != 'Retired') as total_equipment,
            (SELECT COUNT(*) FROM equipment WHERE status = 'Operational') as operational_equipment,
            (SELECT COUNT(*) FROM equipment WHERE status = 'Maintenance') as maintenance_equipment,
            (SELECT COUNT(*) FROM equipment_assignments WHERE returned_at IS NULL) as assigned_equipment,
            
            -- Department count
            (SELECT COUNT(*) FROM departments) as total_departments,
            
            -- This month stats
            (SELECT COUNT(*) FROM requests 
             WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)) as requests_this_month,
            (SELECT COUNT(*) FROM requests 
             WHERE status = 'Completed' 
             AND COALESCE(completed_at, updated_at) >= DATE_TRUNC('month', CURRENT_DATE)) as completed_this_month
        `),

        // 2. Department Performance Comparison
        pool.query(`
          SELECT 
            d.id,
            d.name,
            d.description,
            COUNT(DISTINCT u.id) as member_count,
            COUNT(DISTINCT CASE WHEN r.status = 'Pending' THEN r.id END) as pending_requests,
            COUNT(DISTINCT CASE WHEN r.status IN ('Approved', 'In Progress') THEN r.id END) as active_requests,
            COUNT(DISTINCT CASE WHEN r.status = 'Completed' THEN r.id END) as completed_requests,
            COUNT(DISTINCT ea.id) as equipment_assigned,
            COALESCE(AVG(EXTRACT(EPOCH FROM (r.approved_at - r.created_at))/3600), 0) as avg_approval_hours
          FROM departments d
          LEFT JOIN users u ON u.department_id = d.id AND u.role IN ('engineer', 'staff', 'manager')
          LEFT JOIN requests r ON r.department_id = d.id AND r.created_at >= CURRENT_DATE - INTERVAL '30 days'
          LEFT JOIN equipment_assignments ea ON ea.assigned_to = u.id AND ea.returned_at IS NULL
          GROUP BY d.id, d.name, d.description
          ORDER BY d.name
        `),

        // 3. Recent Activity (Last 20 actions)
        pool.query(`
          SELECT 
            r.id,
            r.subject,
            r.status,
            r.priority,
            r.request_type,
            r.created_at,
            r.updated_at,
            u.name as requested_by_name,
            u.role as requester_role,
            d.name as department_name,
            approver.name as approved_by_name
          FROM requests r
          LEFT JOIN users u ON r.requested_by = u.id
          LEFT JOIN departments d ON r.department_id = d.id
          LEFT JOIN users approver ON r.approved_by = approver.id
          ORDER BY r.updated_at DESC
          LIMIT 20
        `),

        // 4. User Breakdown by Department and Role
        pool.query(`
          SELECT 
            d.name as department_name,
            u.role,
            COUNT(*) as count
          FROM users u
          LEFT JOIN departments d ON u.department_id = d.id
          WHERE u.email != 'deleted@system.local'
          GROUP BY d.name, u.role
          ORDER BY d.name, u.role
        `),

        // 5. Equipment Utilization
        pool.query(`
          SELECT 
            e.status,
            COUNT(*) as count,
            ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM equipment WHERE status != 'Retired'), 2) as percentage
          FROM equipment e
          WHERE e.status != 'Retired'
          GROUP BY e.status
          ORDER BY count DESC
        `),

        // 6. Pending Approvals by Department (Top 10)
        pool.query(`
          SELECT 
            r.id,
            r.subject,
            r.priority,
            r.request_type,
            r.created_at,
            d.name as department_name,
            u.name as requested_by_name,
            u.role as requester_role,
            EXTRACT(EPOCH FROM (NOW() - r.created_at))/3600 as hours_pending
          FROM requests r
          LEFT JOIN departments d ON r.department_id = d.id
          LEFT JOIN users u ON r.requested_by = u.id
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
        `),

        // 7. System Performance Metrics (Last 30 days)
        pool.query(`
          SELECT 
            COUNT(*) as total_requests,
            COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_count,
            COUNT(CASE WHEN status = 'Rejected' THEN 1 END) as rejected_count,
            COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_count,
            COALESCE(AVG(EXTRACT(EPOCH FROM (approved_at - created_at))/3600), 0) as avg_approval_hours,
            COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(completed_at, updated_at) - created_at))/86400), 0) as avg_completion_days
          FROM requests
          WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        `)
      ]);

      // ==================== PROCESS RESULTS ====================
      const systemStats = systemStatsQuery.rows[0] || {};
      const departmentStats = departmentStatsQuery.rows || [];
      const recentActivity = recentActivityQuery.rows || [];
      const userBreakdown = userBreakdownQuery.rows || [];
      const equipmentUtilization = equipmentUtilizationQuery.rows || [];
      const pendingApprovals = pendingApprovalsQuery.rows || [];
      const performanceMetrics = performanceMetricsQuery.rows[0] || {};

      // Calculate system health score (0-100)
      const healthScore = calculateSystemHealth(systemStats, performanceMetrics);

      // ==================== RESPONSE ====================
      const dashboardData = {
        systemStats: {
          users: {
            total: parseInt(systemStats.total_users || 0),
            engineers: parseInt(systemStats.total_engineers || 0),
            managers: parseInt(systemStats.total_managers || 0),
            staff: parseInt(systemStats.total_staff || 0)
          },
          requests: {
            total: parseInt(systemStats.total_requests || 0),
            pending: parseInt(systemStats.pending_requests || 0),
            approved: parseInt(systemStats.approved_requests || 0),
            completed: parseInt(systemStats.completed_requests || 0),
            rejected: parseInt(systemStats.rejected_requests || 0),
            thisMonth: parseInt(systemStats.requests_this_month || 0),
            completedThisMonth: parseInt(systemStats.completed_this_month || 0)
          },
          equipment: {
            total: parseInt(systemStats.total_equipment || 0),
            operational: parseInt(systemStats.operational_equipment || 0),
            maintenance: parseInt(systemStats.maintenance_equipment || 0),
            assigned: parseInt(systemStats.assigned_equipment || 0),
            available: parseInt(systemStats.operational_equipment || 0) - parseInt(systemStats.assigned_equipment || 0)
          },
          departments: parseInt(systemStats.total_departments || 0),
          healthScore: healthScore
        },
        
        departmentComparison: departmentStats.map(dept => ({
          id: dept.id,
          name: dept.name,
          description: dept.description,
          memberCount: parseInt(dept.member_count || 0),
          pendingRequests: parseInt(dept.pending_requests || 0),
          activeRequests: parseInt(dept.active_requests || 0),
          completedRequests: parseInt(dept.completed_requests || 0),
          equipmentAssigned: parseInt(dept.equipment_assigned || 0),
          avgApprovalHours: parseFloat(dept.avg_approval_hours || 0).toFixed(1)
        })),

        recentActivity: recentActivity.map(activity => ({
          ...activity,
          created_at: activity.created_at,
          updated_at: activity.updated_at
        })),

        userBreakdown: userBreakdown,

        equipmentUtilization: equipmentUtilization.map(item => ({
          status: item.status,
          count: parseInt(item.count),
          percentage: parseFloat(item.percentage)
        })),

        pendingApprovals: pendingApprovals.map(req => ({
          ...req,
          hours_pending: Math.floor(req.hours_pending || 0)
        })),

        performance: {
          last30Days: {
            totalRequests: parseInt(performanceMetrics.total_requests || 0),
            completedCount: parseInt(performanceMetrics.completed_count || 0),
            rejectedCount: parseInt(performanceMetrics.rejected_count || 0),
            pendingCount: parseInt(performanceMetrics.pending_count || 0),
            avgApprovalHours: parseFloat(performanceMetrics.avg_approval_hours || 0).toFixed(1),
            avgCompletionDays: parseFloat(performanceMetrics.avg_completion_days || 0).toFixed(1),
            completionRate: performanceMetrics.total_requests > 0 
              ? ((performanceMetrics.completed_count / performanceMetrics.total_requests) * 100).toFixed(1)
              : '0.0'
          }
        }
      };

      console.log('✅ Admin dashboard stats fetched successfully');
      res.json(dashboardData);

    } catch (err) {
      console.error('❌ Admin dashboard stats error:', err);
      res.status(500).json({ 
        error: 'Failed to fetch admin dashboard stats',
        details: err.message 
      });
    }
  }
);

/**
 * Calculate system health score based on various metrics
 * @param {Object} systemStats - System statistics
 * @param {Object} performanceMetrics - Performance metrics
 * @returns {Number} Health score (0-100)
 */
function calculateSystemHealth(systemStats, performanceMetrics) {
  let score = 100;

  // Deduct points for high pending request ratio
  const pendingRatio = systemStats.total_requests > 0 
    ? (systemStats.pending_requests / systemStats.total_requests) * 100 
    : 0;
  if (pendingRatio > 30) score -= 15;
  else if (pendingRatio > 20) score -= 10;
  else if (pendingRatio > 10) score -= 5;

  // Deduct points for equipment in maintenance
  const maintenanceRatio = systemStats.total_equipment > 0
    ? (systemStats.maintenance_equipment / systemStats.total_equipment) * 100
    : 0;
  if (maintenanceRatio > 20) score -= 15;
  else if (maintenanceRatio > 10) score -= 10;
  else if (maintenanceRatio > 5) score -= 5;

  // Deduct points for slow approval times (>24 hours average)
  const avgApprovalHours = parseFloat(performanceMetrics.avg_approval_hours || 0);
  if (avgApprovalHours > 48) score -= 20;
  else if (avgApprovalHours > 24) score -= 10;
  else if (avgApprovalHours > 12) score -= 5;

  // Deduct points for low completion rate
  const completionRate = performanceMetrics.total_requests > 0
    ? (performanceMetrics.completed_count / performanceMetrics.total_requests) * 100
    : 0;
  if (completionRate < 50) score -= 15;
  else if (completionRate < 70) score -= 10;

  return Math.max(0, Math.min(100, score));
}

module.exports = router;