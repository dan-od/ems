const express = require('express');
const { authenticateJWT, checkRole } = require('../../middleware/auth');
const pool = require('../../config/db');
const router = express.Router();

// Approve a request - FIXED PATH
router.patch('/approve/:id', authenticateJWT(), checkRole(['admin', 'manager']), async (req, res) => {
  const requestId = req.params.id;
  const userId = req.user.id;

  try {
    await pool.query('BEGIN');
    const { rows } = await pool.query(
      `UPDATE requests 
       SET status = 'Approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [userId, requestId]
    );
    if (!rows.length) throw new Error('Request not found');

    await pool.query(
      `INSERT INTO request_approvals (request_id, department_id, approved_by, status)
       VALUES ($1, $2, $3, 'approved')`,
      [requestId, rows[0].department_id, userId]
    );

    await pool.query('COMMIT');
    res.json({ message: 'Request approved', request: rows[0] });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('❌ Approve request error:', err);
    res.status(500).json({ error: 'Failed to approve request', details: err.message });
  }
});

// Reject a request - FIXED PATH
router.patch('/reject/:id', authenticateJWT(), checkRole(['admin', 'manager']), async (req, res) => {
  const requestId = req.params.id;
  const userId = req.user.id;
  const { notes } = req.body;

  try {
    await pool.query('BEGIN');
    const { rows } = await pool.query(
      `UPDATE requests 
       SET status = 'Rejected', approved_by = $1, approved_at = NOW(), updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [userId, requestId]
    );
    if (!rows.length) throw new Error('Request not found');

    await pool.query(
      `INSERT INTO request_approvals (request_id, department_id, approved_by, status, notes)
       VALUES ($1, $2, $3, 'rejected', $4)`,
      [requestId, rows[0].department_id, userId, notes || null]
    );

    await pool.query('COMMIT');
    res.json({ message: 'Request rejected', request: rows[0] });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('❌ Reject request error:', err);
    res.status(500).json({ error: 'Failed to reject request', details: err.message });
  }
});

// Transfer a request - FIXED PATH
router.patch('/transfer/:id', authenticateJWT(), checkRole(['admin', 'manager']), async (req, res) => {
  const requestId = req.params.id;
  const userId = req.user.id;
  const { targetDepartmentId, notes } = req.body;

  try {
    await pool.query('BEGIN');
    const { rows } = await pool.query(
      `UPDATE requests 
       SET department_id = $1,
           transferred_to_department = $1,
           transferred_by = $2,
           transfer_notes = $3,
           transferred_at = NOW(),
           updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [targetDepartmentId, userId, notes || null, requestId]
    );
    if (!rows.length) throw new Error('Request not found');

    await pool.query(
      `INSERT INTO request_approvals (request_id, department_id, approved_by, status, notes)
       VALUES ($1, $2, $3, 'transferred', $4)`,
      [requestId, targetDepartmentId, userId, notes || null]
    );

    await pool.query('COMMIT');
    res.json({ message: 'Request transferred', request: rows[0] });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('❌ Transfer request error:', err);
    res.status(500).json({ error: 'Failed to transfer request', details: err.message });
  }
});

module.exports = router;