// routes/maintenanceRequests.js
const express = require('express');
const pool = require('../config/db');
const { authenticateJWT } = require('../middleware/auth');
const router = express.Router();

// Create a maintenance request
router.post('/', authenticateJWT(), async (req, res) => {
  const { subject, description, priority, department_id, equipment_id, issue_description, urgency } = req.body;
  const userId = req.user.id;

  try {
    // 1. Create parent request
    const requestRes = await pool.query(
      `INSERT INTO requests (requested_by, subject, description, priority, department_id, request_type)
       VALUES ($1, $2, $3, $4, $5, 'maintenance')
       RETURNING id`,
      [userId, subject, description, priority, department_id]
    );

    const requestId = requestRes.rows[0].id;

    // 2. Insert into maintenance_requests
    await pool.query(
      `INSERT INTO maintenance_requests (request_id, equipment_id, issue_description, urgency)
       VALUES ($1, $2, $3, $4)`,
      [requestId, equipment_id, issue_description, urgency]
    );

    res.status(201).json({ request_id: requestId, message: 'Maintenance request created' });
  } catch (err) {
    console.error('❌ Error creating maintenance request:', err);
    res.status(500).json({ error: 'Failed to create maintenance request' });
  }
});

module.exports = router;
