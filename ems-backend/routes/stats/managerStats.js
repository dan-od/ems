// ems-backend/routes/stats/managerStats.js
const express = require('express');
const { authenticateJWT, checkRole } = require('../../middleware/auth');
const pool = require('../../config/db');
const router = express.Router();

/**
 * Manager Dashboard Stats
 * @route GET /api/stats/manager-dashboard
 * @access Manager, Admin
 * 
 * Returns comprehensive dashboard data for department managers:
 * - Department stats (pending approvals, active jobs, equipment, completions)
 * - Approval queue (top 5 urgent requests)
 * - Team members (engineers/staff in department)
 * - Cross-department transfers (incoming/outgoing)
 * - Performance metrics (approval time, completion rate)
 */
router.get('/manager-dashboard', 
  authenticateJWT(), 
  checkRole(['manager', 'admin']), 
  async (req, res) => {
    try {
      const userId = req.user.id;
      let deptId = req.user.department_id;

      // Admin can query specific department
      if (req.user.role === 'admin' && req.query.deptId) {
        deptId = Number(req.query.deptId);
      }

      if (!deptId) {
        return res.status(400).json({ error: 'Department not specified or assigned' });
      }

      console.log(`\n📊 [MANAGER DASHBOARD] Fetching stats for Department #${deptId}`);

      // ==================== PARALLEL QUERIES FOR PERFORMANCE ====================
      const [
        statsQuery,
        approvalQueueQuery,
        teamQuery,
        transfersQuery,
        performanceQuery,
        equipmentQuery
      ] = await Promise.all([
        // 1. Department Stats
        pool.query(`
          SELECT 
            COUNT(CASE WHEN r.status = 'Pending' THEN 1 END) as pending_approvals,
            COUNT(CASE WHEN r.status IN ('Approved', 'In Progress') THEN 1 END) as team_active_jobs,
            COUNT(CASE 
              WHEN DATE_TRUNC('month', r.completed_at) = DATE_TRUNC('month', CURRENT_DATE) 
                AND r.status = 'Completed'
              THEN 1 
            END) as month_completed
          FROM requests r
          WHERE r.department_id = $1
        `, [deptId]),

        // 2. Approval Queue (Top 5 urgent requests)
        pool.query(`
          SELECT 
            r.*,
            u.name as requested_by_name,
            u.role as requester_role,
            CASE 
              WHEN r.is_new_equipment THEN r.new_equipment_name 
              ELSE e.name 
            END as equipment_name,
            EXTRACT(EPOCH FROM (NOW() - r.created_at))/3600 as hours_pending
          FROM requests r
          LEFT JOIN users u ON r.requested_by = u.id
          LEFT JOIN equipment e ON r.equipment_id = e.id
          WHERE r.department_id = $1 
            AND r.status = 'Pending'
          ORDER BY 
            CASE r.priority
              WHEN 'Urgent' THEN 1
              WHEN 'High' THEN 2
              WHEN 'Medium' THEN 3
              WHEN 'Low' THEN 4
            END,
            r.created_at ASC
          LIMIT 5
        `, [deptId]),

        // 3. Team Members
        pool.query(`
          SELECT 
            u.id, 
            u.name, 
            u.role, 
            u.email,
            COUNT(DISTINCT r.id) as active_requests,
            COUNT(DISTINCT ea.id) as assigned_equipment
          FROM users u
          LEFT JOIN requests r ON r.requested_by = u.id 
            AND r.status IN ('Pending', 'Approved', 'In Progress')
          LEFT JOIN equipment_assignments ea ON ea.engineer_id = u.id 
            AND ea.returned_at IS NULL
          WHERE u.department_id = $1 
            AND u.role IN ('engineer', 'staff')
          GROUP BY u.id, u.name, u.role, u.email
          ORDER BY u.name
        `, [deptId]),

        // 4. Cross-Department Transfers
        pool.query(`
          -- Incoming transfers
          SELECT 
            'incoming' as direction,
            r.id,
            r.subject,
            r.priority,
            r.created_at,
            r.transferred_at,
            u.name as requested_by_name,
            d.name as origin_dept_name,
            ut.name as transferred_by_name
          FROM requests r
          LEFT JOIN users u ON r.requested_by = u.id
          LEFT JOIN departments d ON r.department_id = d.id
          LEFT JOIN users ut ON r.transferred_by = ut.id
          WHERE r.transferred_to_department = $1 
            AND r.status = 'Transferred'
          
          UNION ALL
          
          -- Outgoing transfers
          SELECT 
            'outgoing' as direction,
            r.id,
            r.subject,
            r.priority,
            r.created_at,
            r.transferred_at,
            u.name as requested_by_name,
            td.name as target_dept_name,
            ut.name as transferred_by_name
          FROM requests r
          LEFT JOIN users u ON r.requested_by = u.id
          LEFT JOIN departments td ON r.transferred_to_department = td.id
          LEFT JOIN users ut ON r.transferred_by = ut.id
          WHERE r.department_id = $1 
            AND r.status = 'Transferred'
          
          ORDER BY created_at DESC
          LIMIT 10
        `, [deptId]),

        // 5. Performance Metrics (Last 7 days)
        pool.query(`
          SELECT 
            COALESCE(AVG(EXTRACT(EPOCH FROM (approved_at - created_at))/3600), 0) as avg_approval_hours,
            COUNT(*) as total_requests,
            COUNT(CASE WHEN status = 'Approved' THEN 1 END) as approved_count,
            COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_count,
            COUNT(CASE WHEN status = 'Rejected' THEN 1 END) as rejected_count
          FROM requests
          WHERE department_id = $1
            AND created_at >= CURRENT_DATE - INTERVAL '7 days'
        `, [deptId]),

        // 6. Equipment Assigned to Department
        pool.query(`
          SELECT COUNT(DISTINCT ea.id) as dept_equipment_assigned
          FROM equipment_assignments ea
          JOIN users u ON ea.engineer_id = u.id
          WHERE u.department_id = $1 
            AND ea.returned_at IS NULL
        `, [deptId])
      ]);

      // ==================== PROCESS RESULTS ====================
      const stats = statsQuery.rows[0] || {};
      const approvalQueue = approvalQueueQuery.rows;
      const team = teamQuery.rows;
      const allTransfers = transfersQuery.rows;
      const performance = performanceQuery.rows[0] || {};
      const equipmentCount = equipmentQuery.rows[0] || {};

      // Calculate completion rate
      const completionRate = performance.total_requests > 0
        ? ((performance.completed_count / performance.total_requests) * 100).toFixed(1)
        : '0.0';

      // Separate transfers
      const transfers = {
        incoming: allTransfers.filter(t => t.direction === 'incoming'),
        outgoing: allTransfers.filter(t => t.direction === 'outgoing')
      };

      // ==================== RESPONSE ====================
      const dashboardData = {
        stats: {
          pendingApprovals: parseInt(stats.pending_approvals || 0),
          teamActiveJobs: parseInt(stats.team_active_jobs || 0),
          deptEquipmentAssigned: parseInt(equipmentCount.dept_equipment_assigned || 0),
          monthCompleted: parseInt(stats.month_completed || 0)
        },
        approvalQueue: approvalQueue.map(req => ({
          ...req,
          hours_pending: Math.floor(req.hours_pending || 0)
        })),
        teamMembers: team,
        crossDeptTransfers: transfers,
        performance: {
          avgApprovalTime: parseFloat(performance.avg_approval_hours || 0).toFixed(1),
          totalRequests: parseInt(performance.total_requests || 0),
          approvedCount: parseInt(performance.approved_count || 0),
          completedCount: parseInt(performance.completed_count || 0),
          rejectedCount: parseInt(performance.rejected_count || 0),
          completionRate: completionRate
        }
      };

      console.log('✅ Manager dashboard stats fetched successfully');
      res.json(dashboardData);

    } catch (err) {
      console.error('❌ Manager dashboard stats error:', err);
      res.status(500).json({ 
        error: 'Failed to fetch manager dashboard stats',
        details: err.message 
      });
    }
  }
);

module.exports = router;