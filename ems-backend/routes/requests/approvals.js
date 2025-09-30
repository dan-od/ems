const express = require('express');
const { authenticateJWT, checkRole } = require('../../middleware/auth');
const pool = require('../../config/db');
const router = express.Router();

// ==================== APPROVAL ACTIONS ====================
// Routes maintain OLD URL pattern for backward compatibility:
// PATCH /requests/:id/approve
// PATCH /requests/:id/reject
// PATCH /requests/:id/transfer

/**
 * Approve a request
 * @route PATCH /requests/:id/approve
 * @access Manager, Admin
 */
router.patch('/:id/approve', authenticateJWT(), checkRole(['admin', 'manager']), async (req, res) => {
  const requestId = req.params.id;
  const userId = req.user.id;

  console.log(`\n🟢 [APPROVE] Request #${requestId} by User #${userId}`);

  try {
    await pool.query('BEGIN');

    // Update request status
    const { rows } = await pool.query(
      `UPDATE requests 
       SET status = 'Approved', 
           approved_by = $1, 
           approved_at = NOW(), 
           updated_at = NOW()
       WHERE id = $2 
       RETURNING *`,
      [userId, requestId]
    );

    if (!rows.length) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = rows[0];

    // Log approval in audit trail
    await pool.query(
      `INSERT INTO request_approvals (request_id, department_id, approved_by, status, created_at)
       VALUES ($1, $2, $3, 'approved', NOW())`,
      [requestId, request.department_id, userId]
    );

    await pool.query('COMMIT');
    console.log(`✅ Request #${requestId} approved successfully`);

    res.json({ 
      message: 'Request approved', 
      request 
    });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('❌ Approve request error:', err);
    res.status(500).json({ 
      error: 'Failed to approve request', 
      details: err.message 
    });
  }
});

/**
 * Reject a request
 * @route PATCH /requests/:id/reject
 * @access Manager, Admin
 */
router.patch('/:id/reject', authenticateJWT(), checkRole(['admin', 'manager']), async (req, res) => {
  const requestId = req.params.id;
  const userId = req.user.id;
  const { notes } = req.body;

  console.log(`\n🔴 [REJECT] Request #${requestId} by User #${userId}`);

  if (!notes || !notes.trim()) {
    return res.status(400).json({ error: 'Rejection notes are required' });
  }

  try {
    await pool.query('BEGIN');

    // Update request status
    const { rows } = await pool.query(
      `UPDATE requests 
       SET status = 'Rejected', 
           approved_by = $1, 
           approved_at = NOW(), 
           updated_at = NOW()
       WHERE id = $2 
       RETURNING *`,
      [userId, requestId]
    );

    if (!rows.length) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = rows[0];

    // Log rejection in audit trail with notes
    await pool.query(
      `INSERT INTO request_approvals (request_id, department_id, approved_by, status, notes, created_at)
       VALUES ($1, $2, $3, 'rejected', $4, NOW())`,
      [requestId, request.department_id, userId, notes]
    );

    await pool.query('COMMIT');
    console.log(`✅ Request #${requestId} rejected with reason: ${notes.substring(0, 50)}...`);

    res.json({ 
      message: 'Request rejected', 
      request 
    });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('❌ Reject request error:', err);
    res.status(500).json({ 
      error: 'Failed to reject request', 
      details: err.message 
    });
  }
});

/**
 * Transfer a request to another department
 * @route PATCH /requests/:id/transfer
 * @access Manager, Admin
 */
router.patch('/:id/transfer', authenticateJWT(), checkRole(['admin', 'manager']), async (req, res) => {
  const requestId = req.params.id;
  const userId = req.user.id;
  const { targetDepartmentId, notes } = req.body;

  console.log(`\n🔄 [TRANSFER] Request #${requestId} to Department #${targetDepartmentId}`);

  if (!targetDepartmentId) {
    return res.status(400).json({ error: 'Target department is required' });
  }

  try {
    await pool.query('BEGIN');

    // Verify target department exists
    const deptCheck = await pool.query(
      'SELECT id, name FROM departments WHERE id = $1',
      [targetDepartmentId]
    );

    if (!deptCheck.rows.length) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Target department not found' });
    }

    const targetDept = deptCheck.rows[0];

    // Update request with transfer info
    const { rows } = await pool.query(
      `UPDATE requests 
       SET department_id = $1,
           transferred_to_department = $1,
           transferred_by = $2,
           transfer_notes = $3,
           transferred_at = NOW(),
           status = 'Transferred',
           updated_at = NOW()
       WHERE id = $4 
       RETURNING *`,
      [targetDepartmentId, userId, notes || null, requestId]
    );

    if (!rows.length) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = rows[0];

    // Log transfer in audit trail
    await pool.query(
      `INSERT INTO request_approvals (request_id, department_id, approved_by, status, notes, created_at)
       VALUES ($1, $2, $3, 'transferred', $4, NOW())`,
      [requestId, targetDepartmentId, userId, notes || `Transferred to ${targetDept.name}`]
    );

    await pool.query('COMMIT');
    console.log(`✅ Request #${requestId} transferred to ${targetDept.name}`);

    res.json({ 
      message: 'Request transferred', 
      request,
      targetDepartment: targetDept
    });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('❌ Transfer request error:', err);
    res.status(500).json({ 
      error: 'Failed to transfer request', 
      details: err.message 
    });
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