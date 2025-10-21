const express = require('express');
const { authenticateJWT, checkRole } = require('../../middleware/auth');
const pool = require('../../config/db');
const router = express.Router();
// ems-backend/routes/requests/approvals.js
const { logActivity, logBothSides, ACTION_TYPES, ENTITY_TYPES, extractUserInfo } = require('../../utils/activityLogger');

// ============== APPROVE REQUEST ==============
router.patch('/:id/approve', authenticateJWT(), checkRole(['admin', 'manager']), async (req, res) => {
  const requestId = req.params.id;
  const managerInfo = extractUserInfo(req);
  
  try {
    await pool.query('BEGIN');
    
    // Get full request details including requester info
    const requestQuery = await pool.query(`
      SELECT r.*, 
             u.name as requester_name, 
             u.role as requester_role,
             u.department_id as requester_dept_id,
             u_dept.name as requester_dept_name
      FROM requests r
      JOIN users u ON r.requested_by = u.id
      LEFT JOIN departments u_dept ON u.department_id = u_dept.id
      WHERE r.id = $1
    `, [requestId]);
    
    if (!requestQuery.rows.length) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Request not found' });
    }
    
    const request = requestQuery.rows[0];
    
    // Update request
    await pool.query(
      `UPDATE requests 
       SET status = 'Approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [managerInfo.userId, requestId]
    );
    
    // Log in audit trail
    await pool.query(
      `INSERT INTO request_approvals (request_id, department_id, approved_by, status, created_at)
       VALUES ($1, $2, $3, 'approved', NOW())`,
      [requestId, request.department_id, managerInfo.userId]
    );
    
    // ✅ LOG BOTH SIDES - Manager and Requester
    const requesterInfo = {
      userId: request.requested_by,
      userName: request.requester_name,
      userRole: request.requester_role,
      departmentId: request.requester_dept_id,
      departmentName: request.requester_dept_name,
      ipAddress: req.ip
    };
    
    await logBothSides({
      managerInfo,
      requesterInfo,
      request: {
        id: request.id,
        request_type: request.request_type,
        subject: request.subject
      },
      actionType: ACTION_TYPES.REQUEST_APPROVED,
      status: 'Approved',
      notes: null
    });
    
    await pool.query('COMMIT');
    res.json({ message: 'Request approved', request });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('❌ Approve request error:', err);
    res.status(500).json({ error: 'Failed to approve request' });
  }
});

// ============== REJECT REQUEST ==============
router.patch('/:id/reject', authenticateJWT(), checkRole(['admin', 'manager']), async (req, res) => {
  const requestId = req.params.id;
  const { notes } = req.body;
  const managerInfo = extractUserInfo(req);
  
  if (!notes || !notes.trim()) {
    return res.status(400).json({ error: 'Rejection notes are required' });
  }
  
  try {
    await pool.query('BEGIN');
    
    // Get full request details
    const requestQuery = await pool.query(`
      SELECT r.*, 
             u.name as requester_name, 
             u.role as requester_role,
             u.department_id as requester_dept_id,
             u_dept.name as requester_dept_name
      FROM requests r
      JOIN users u ON r.requested_by = u.id
      LEFT JOIN departments u_dept ON u.department_id = u_dept.id
      WHERE r.id = $1
    `, [requestId]);
    
    if (!requestQuery.rows.length) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Request not found' });
    }
    
    const request = requestQuery.rows[0];
    
    // Update request
    await pool.query(
      `UPDATE requests 
       SET status = 'Rejected', approved_by = $1, approved_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [managerInfo.userId, requestId]
    );
    
    // Log in audit trail with notes
    await pool.query(
      `INSERT INTO request_approvals (request_id, department_id, approved_by, status, notes, created_at)
       VALUES ($1, $2, $3, 'rejected', $4, NOW())`,
      [requestId, request.department_id, managerInfo.userId, notes]
    );
    
    // ✅ LOG BOTH SIDES with rejection reason
    const requesterInfo = {
      userId: request.requested_by,
      userName: request.requester_name,
      userRole: request.requester_role,
      departmentId: request.requester_dept_id,
      departmentName: request.requester_dept_name,
      ipAddress: req.ip
    };
    
    await logBothSides({
      managerInfo,
      requesterInfo,
      request: {
        id: request.id,
        request_type: request.request_type,
        subject: request.subject
      },
      actionType: ACTION_TYPES.REQUEST_REJECTED,
      status: 'Rejected',
      notes: notes
    });
    
    await pool.query('COMMIT');
    res.json({ message: 'Request rejected', request });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('❌ Reject request error:', err);
    res.status(500).json({ error: 'Failed to reject request' });
  }
});

// ============== TRANSFER REQUEST ==============
router.patch('/:id/transfer', authenticateJWT(), checkRole(['admin', 'manager']), async (req, res) => {
  const requestId = req.params.id;
  const { targetDepartmentId, notes } = req.body;
  const managerInfo = extractUserInfo(req);
  
  if (!targetDepartmentId) {
    return res.status(400).json({ error: 'Target department is required' });
  }
  
  try {
    await pool.query('BEGIN');
    
    // Get target department info
    const deptCheck = await pool.query(
      'SELECT id, name FROM departments WHERE id = $1',
      [targetDepartmentId]
    );
    
    if (!deptCheck.rows.length) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Target department not found' });
    }
    
    const targetDept = deptCheck.rows[0];
    
    // Get full request details
    const requestQuery = await pool.query(`
      SELECT r.*, 
             u.name as requester_name, 
             u.role as requester_role,
             u.department_id as requester_dept_id,
             u_dept.name as requester_dept_name,
             origin_dept.name as origin_dept_name
      FROM requests r
      JOIN users u ON r.requested_by = u.id
      LEFT JOIN departments u_dept ON u.department_id = u_dept.id
      LEFT JOIN departments origin_dept ON r.department_id = origin_dept.id
      WHERE r.id = $1
    `, [requestId]);
    
    if (!requestQuery.rows.length) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Request not found' });
    }
    
    const request = requestQuery.rows[0];
    
    // Update request with transfer
    await pool.query(
      `UPDATE requests 
       SET department_id = $1,
           transferred_to_department = $1,
           transferred_by = $2,
           transfer_notes = $3,
           transferred_at = NOW(),
           status = 'Transferred',
           updated_at = NOW()
       WHERE id = $4`,
      [targetDepartmentId, managerInfo.userId, notes || null, requestId]
    );
    
    // Log in audit trail
    await pool.query(
      `INSERT INTO request_approvals (request_id, department_id, approved_by, status, notes, created_at)
       VALUES ($1, $2, $3, 'transferred', $4, NOW())`,
      [requestId, targetDepartmentId, managerInfo.userId, notes || `Transferred to ${targetDept.name}`]
    );
    
    // ✅ LOG FOR MANAGER WHO TRANSFERRED
    await logActivity({
      ...managerInfo,
      actionType: ACTION_TYPES.REQUEST_TRANSFERRED,
      entityType: ENTITY_TYPES.REQUEST,
      entityId: request.id,
      entityName: `${request.request_type} Request #${request.id}`,
      description: `Transferred ${request.request_type} request from ${request.origin_dept_name} to ${targetDept.name}`,
      metadata: {
        from_department: request.origin_dept_name,
        to_department: targetDept.name,
        to_department_id: targetDepartmentId,
        transfer_notes: notes || null
      }
    });
    
    // ✅ LOG FOR REQUESTER
    await logActivity({
      userId: request.requested_by,
      userName: request.requester_name,
      userRole: request.requester_role,
      departmentId: request.requester_dept_id,
      departmentName: request.requester_dept_name,
      actionType: ACTION_TYPES.REQUEST_TRANSFERRED,
      entityType: ENTITY_TYPES.REQUEST,
      entityId: request.id,
      entityName: `${request.request_type} Request #${request.id}`,
      description: `Your request was transferred from ${request.origin_dept_name} to ${targetDept.name}`,
      metadata: {
        transferred_by: managerInfo.userId,
        transferred_by_name: managerInfo.userName,
        from_department: request.origin_dept_name,
        to_department: targetDept.name,
        transfer_notes: notes || null
      },
      ipAddress: req.ip
    });
    
    await pool.query('COMMIT');
    res.json({ message: 'Request transferred', request, targetDepartment: targetDept });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('❌ Transfer request error:', err);
    res.status(500).json({ error: 'Failed to transfer request' });
  }
});

/**
 * Get transfer options for a request
 * @route GET /requests/:id/transfer-options
 * @access Manager, Admin
 */
router.get('/:id/transfer-options', authenticateJWT(), checkRole(['admin', 'manager']), async (req, res) => {
  const requestId = req.params.id;
  const userId = req.user.id;

  try {
    // Get current request's department
    const requestResult = await pool.query(
      'SELECT department_id FROM requests WHERE id = $1',
      [requestId]
    );

    if (!requestResult.rows.length) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const currentDeptId = requestResult.rows[0].department_id;

    // Get all departments except current one
    const { rows } = await pool.query(
      `SELECT id, name, description 
       FROM departments 
       WHERE id != $1 
       ORDER BY name`,
      [currentDeptId]
    );

    res.json(rows);
  } catch (err) {
    console.error('❌ Fetch transfer options error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch transfer options', 
      details: err.message 
    });
  }
});

module.exports = router;