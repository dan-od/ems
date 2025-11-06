// ems-backend/routes/requests/managerDashboard.js
// Routes specifically for Manager Dashboard component

const express = require('express');
const { authenticateJWT, checkRole } = require('../../middleware/auth');
const pool = require('../../config/db');
const router = express.Router();

console.log('📊 [MANAGER DASHBOARD] Loading manager dashboard routes...');

// ============================================
// MANAGER DASHBOARD SPECIFIC ROUTES
// ============================================

/**
 * GET /api/requests/pending-approval
 * Fetch all pending requests for manager's department
 * Used by: Manager Dashboard Approval Queue Component
 */
router.get('/pending-approval', authenticateJWT(), checkRole(['manager', 'admin']), async (req, res) => {
  console.log('\n📋 [PENDING APPROVAL] Fetching pending approvals');
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
      SELECT 
        r.*,
        u.name as requested_by_name,
        u.email as requested_by_email,
        d.name as department_name
      FROM requests r
      LEFT JOIN users u ON r.requested_by = u.id
      LEFT JOIN departments d ON r.department_id = d.id
      WHERE 
        r.department_id = $1
        AND r.status = 'Pending'
      ORDER BY 
        CASE r.priority
          WHEN 'Urgent' THEN 1
          WHEN 'High' THEN 2
          WHEN 'Medium' THEN 3
          WHEN 'Low' THEN 4
        END,
        r.created_at ASC
    `;

    const result = await pool.query(query, [departmentId]);

    console.log(`✅ Found ${result.rows.length} pending requests for department #${departmentId}`);

    res.json({
      success: true,
      requests: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('❌ Error fetching pending approvals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending approvals',
      error: error.message
    });
  }
});

/**
 * GET /api/requests/cross-department
 * Fetch cross-department transfer activities
 * Used by: Manager Dashboard Cross-Department Activity Component
 */
router.get('/cross-department', authenticateJWT(), checkRole(['manager', 'admin']), async (req, res) => {
  console.log('\n🔄 [CROSS-DEPARTMENT] Fetching transfer activities');
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
      SELECT 
        r.*,
        d1.name as from_department,
        d2.name as to_department,
        u1.name as transferred_by_name,
        u2.name as requested_by_name
      FROM requests r
      LEFT JOIN departments d1 ON r.department_id = d1.id
      LEFT JOIN departments d2 ON r.transferred_to_department = d2.id
      LEFT JOIN users u1 ON r.transferred_by = u1.id
      LEFT JOIN users u2 ON r.requested_by = u2.id
      WHERE 
        (r.transferred_to_department = $1 OR r.department_id = $1)
        AND r.transferred_at IS NOT NULL
      ORDER BY r.transferred_at DESC
      LIMIT 50
    `;

    const result = await pool.query(query, [departmentId]);

    console.log(`✅ Found ${result.rows.length} transfer activities for department #${departmentId}`);

    res.json({
      success: true,
      activities: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('❌ Error fetching cross-department activities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cross-department activities',
      error: error.message
    });
  }
});

/**
 * PUT /api/requests/:id/approve
 * Approve a request (PUT method to match frontend expectation)
 * Used by: Manager Dashboard Approve Button
 * 
 * Note: This duplicates PATCH /approve from approvals.js but uses PUT 
 * method to match what the frontend ManagerDashboard.jsx expects
 */
router.put('/:id/approve', authenticateJWT(), checkRole(['admin', 'manager']), async (req, res) => {
  console.log('\n✅ [APPROVE] Processing approval request');
  const requestId = req.params.id;
  const { approved_by, department_id } = req.body;
  
  console.log('📝 Approve details:', { requestId, approved_by, department_id });

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Validate request exists and is in correct status
    const requestCheck = await client.query(
      'SELECT * FROM requests WHERE id = $1 AND department_id = $2',
      [requestId, department_id]
    );

    if (requestCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      console.log('❌ Request not found or unauthorized');
      return res.status(404).json({
        success: false,
        message: 'Request not found or unauthorized'
      });
    }

    const request = requestCheck.rows[0];

    if (request.status !== 'Pending' && request.status !== 'Transferred') {
      await client.query('ROLLBACK');
      console.log('❌ Cannot approve - wrong status:', request.status);
      return res.status(400).json({
        success: false,
        message: `Cannot approve request with status: ${request.status}`
      });
    }

    // Update request to approved
    const updateQuery = `
      UPDATE requests 
      SET 
        status = 'Approved',
        approved_by = $1,
        approved_at = NOW(),
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    const result = await client.query(updateQuery, [approved_by, requestId]);

    // Insert into request_approvals table
    await client.query(
      `INSERT INTO request_approvals (request_id, department_id, approved_by, status, created_at)
       VALUES ($1, $2, $3, 'approved', NOW())`,
      [requestId, department_id, approved_by]
    );

    // Log activity (if you have activity_logs table)
    try {
      await client.query(`
        INSERT INTO activity_logs (
          activity_category, activity_type, user_id, user_role,
          target_type, target_name, action, description,
          department_id, created_at
        ) VALUES (
          'REQUEST', 'APPROVAL', $1, $2,
          'Request', $3, 'Approved', 'Request approved by manager',
          $4, NOW()
        )
      `, [
        approved_by,
        req.user.role,
        request.subject,
        department_id
      ]);
      console.log('📝 Activity logged successfully');
    } catch (logError) {
      console.warn('⚠️ Activity logging failed (non-critical):', logError.message);
    }

    await client.query('COMMIT');
    
    console.log('✅ Request approved successfully:', requestId);

    res.json({
      success: true,
      message: 'Request approved successfully',
      request: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error approving request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve request',
      error: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * PUT /api/requests/:id/reject
 * Reject a request (PUT method to match frontend expectation)
 * Used by: Manager Dashboard Reject Button
 */
router.put('/:id/reject', authenticateJWT(), checkRole(['admin', 'manager']), async (req, res) => {
  console.log('\n❌ [REJECT] Processing rejection request');
  const requestId = req.params.id;
  const { rejected_by, department_id, rejection_reason } = req.body;
  
  console.log('📝 Reject details:', { requestId, rejected_by, department_id, reason: rejection_reason });

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const requestCheck = await client.query(
      'SELECT * FROM requests WHERE id = $1 AND department_id = $2',
      [requestId, department_id]
    );

    if (requestCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Request not found or unauthorized'
      });
    }

    const request = requestCheck.rows[0];

    if (request.status !== 'Pending' && request.status !== 'Transferred') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Cannot reject request with status: ${request.status}`
      });
    }

    const updateQuery = `
      UPDATE requests 
      SET 
        status = 'Rejected',
        approved_by = $1,
        approved_at = NOW(),
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    const result = await client.query(updateQuery, [rejected_by, requestId]);

    // Log rejection in request_approvals
    await client.query(
      `INSERT INTO request_approvals (request_id, department_id, approved_by, status, notes, created_at)
       VALUES ($1, $2, $3, 'rejected', $4, NOW())`,
      [requestId, department_id, rejected_by, rejection_reason || 'No reason provided']
    );

    // Log activity
    try {
      await client.query(`
        INSERT INTO activity_logs (
          activity_category, activity_type, user_id, user_role,
          target_type, target_name, action, description,
          department_id, created_at
        ) VALUES (
          'REQUEST', 'REJECTION', $1, $2,
          'Request', $3, 'Rejected', $4,
          $5, NOW()
        )
      `, [
        rejected_by,
        req.user.role,
        request.subject,
        `Request rejected: ${rejection_reason || 'No reason provided'}`,
        department_id
      ]);
    } catch (logError) {
      console.warn('⚠️ Activity logging failed (non-critical):', logError.message);
    }

    await client.query('COMMIT');
    
    console.log('✅ Request rejected successfully:', requestId);

    res.json({
      success: true,
      message: 'Request rejected',
      request: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error rejecting request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject request',
      error: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * PUT /api/requests/:id/transfer
 * Transfer a request to another department (PUT method to match frontend)
 * Used by: Manager Dashboard Transfer Button
 */
router.put('/:id/transfer', authenticateJWT(), checkRole(['admin', 'manager']), async (req, res) => {
  console.log('\n🔄 [TRANSFER] Processing transfer request');
  const requestId = req.params.id;
  const {
    from_department_id,
    to_department_id,
    transferred_by,
    transfer_notes
  } = req.body;
  
  console.log('📝 Transfer details:', { requestId, from: from_department_id, to: to_department_id });

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Validate departments exist
    const deptCheck = await client.query(
      'SELECT id, name FROM departments WHERE id = ANY($1)',
      [[from_department_id, to_department_id]]
    );

    if (deptCheck.rows.length !== 2) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Invalid department IDs'
      });
    }

    const deptMap = {};
    deptCheck.rows.forEach(dept => {
      deptMap[dept.id] = dept.name;
    });

    const requestCheck = await client.query(
      'SELECT * FROM requests WHERE id = $1 AND department_id = $2',
      [requestId, from_department_id]
    );

    if (requestCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Request not found or unauthorized'
      });
    }

    const updateQuery = `
      UPDATE requests 
      SET 
        department_id = $1,
        transferred_to_department = $1,
        transferred_by = $2,
        transfer_notes = $3,
        transferred_at = NOW(),
        updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `;

    const result = await client.query(updateQuery, [
      to_department_id,
      transferred_by,
      transfer_notes || `Transferred from ${deptMap[from_department_id]} to ${deptMap[to_department_id]}`,
      requestId
    ]);

    // Log transfer in request_approvals
    await client.query(
      `INSERT INTO request_approvals (request_id, department_id, approved_by, status, notes, created_at)
       VALUES ($1, $2, $3, 'transferred', $4, NOW())`,
      [requestId, to_department_id, transferred_by, transfer_notes || `Transferred to ${deptMap[to_department_id]}`]
    );

    await client.query('COMMIT');
    
    console.log('✅ Request transferred successfully:', requestId);

    res.json({
      success: true,
      message: 'Request transferred successfully',
      request: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error transferring request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to transfer request',
      error: error.message
    });
  } finally {
    client.release();
  }
});

console.log('✅ [MANAGER DASHBOARD] Manager dashboard routes loaded\n');

module.exports = router;