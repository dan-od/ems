const express = require('express');
const { authenticateJWT } = require('../../middleware/auth');
const pool = require('../../config/db');
const router = express.Router();

// ----------------------
// GET all requests (with optional ?type= filter)
// ----------------------
router.get('/list', authenticateJWT(), async (req, res) => {
  const { type } = req.query;
  const user = req.user;

  try {
    let query, params;

    if (user.role === 'manager') {
      if (type) {
        query = `SELECT * FROM requests WHERE department_id = $1 AND request_type = $2 ORDER BY created_at DESC`;
        params = [user.department_id, type];
      } else {
        query = `SELECT * FROM requests WHERE department_id = $1 ORDER BY created_at DESC`;
        params = [user.department_id];
      }
    } else {
      if (type) {
        query = `SELECT * FROM requests WHERE request_type = $1 ORDER BY created_at DESC`;
        params = [type];
      } else {
        query = `SELECT * FROM requests ORDER BY created_at DESC`;
        params = [];
      }
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching requests:', err);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// ----------------------
// GET request by ID (FIXED - removed redirect issue)
// ----------------------
router.get('/:id', authenticateJWT(), async (req, res) => {
  console.log('\n📄 [FETCH REQUEST] Getting request details');
  const requestId = parseInt(req.params.id, 10);
  console.log('👤 User:', { id: req.user.id, role: req.user.role, dept: req.user.department_id });
  console.log('🔍 Requested ID:', requestId);

  if (isNaN(requestId)) {
    return res.status(400).json({ error: 'Request ID must be a number' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT 
        r.*, 
        u1.name as requested_by_name,
        u1.email as requested_by_email,
        u2.name as approved_by_name,
        d.name as department_name,
        td.name as transferred_to_department_name,
        ut.name as transferred_by_name,
        CASE 
          WHEN r.is_new_equipment THEN r.new_equipment_name 
          ELSE e.name 
        END as display_name
       FROM requests r
       LEFT JOIN equipment e ON r.equipment_id = e.id
       LEFT JOIN users u1 ON r.requested_by = u1.id
       LEFT JOIN users u2 ON r.approved_by = u2.id
       LEFT JOIN departments d ON r.department_id = d.id
       LEFT JOIN departments td ON r.transferred_to_department = td.id
       LEFT JOIN users ut ON r.transferred_by = ut.id
       WHERE r.id = $1`,
      [requestId]
    );

    if (!rows.length) {
      console.log('❌ Request not found');
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = rows[0];
    console.log('✅ Request found:', { 
      id: request.id, 
      status: request.status, 
      dept: request.department_id 
    });

    // ✅ FIXED: Allow managers to view requests in their department
    // Remove the strict authorization that was causing redirects
    if (req.user.role === 'manager') {
      // Manager can view if:
      // 1. Request is in their department, OR
      // 2. Request was transferred to them, OR
      // 3. They are involved in the approval process
      const canView = 
        request.department_id === req.user.department_id ||
        request.transferred_to_department === req.user.department_id ||
        request.approved_by === req.user.id ||
        request.transferred_by === req.user.id;

      if (!canView) {
        console.log('⚠️ Manager attempting to view request outside their scope');
        return res.status(403).json({ 
          error: 'Not authorized to view this request',
          message: 'This request belongs to another department'
        });
      }
    }

    // Engineers can only view their own requests
    if (req.user.role === 'engineer' && request.requested_by !== req.user.id) {
      console.log('⚠️ Engineer attempting to view another user\'s request');
      return res.status(403).json({ 
        error: 'Not authorized to view this request',
        message: 'You can only view your own requests'
      });
    }

    console.log('✅ Authorization passed, returning request');
    res.json(request);

  } catch (err) {
    console.error('❌ GET request error:', err);
    res.status(500).json({ error: 'Failed to fetch request' });
  }
});

// ----------------------
// GET pending requests for dashboard
// ----------------------
router.get('/dashboard/pending', authenticateJWT(), async (req, res) => {
  try {
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'requests' 
      AND column_name = 'is_new_equipment'
    `);
    const hasNewEquipmentColumn = columnCheck.rows.length > 0;

    const query = `
      SELECT 
        r.id,
        r.subject,
        r.priority,
        r.created_at,
        ${hasNewEquipmentColumn
          ? "CASE WHEN r.is_new_equipment THEN r.new_equipment_name ELSE e.name END"
          : "e.name"} as equipment_name,
        u1.name as requested_by_name
      FROM requests r
      LEFT JOIN equipment e ON r.equipment_id = e.id
      LEFT JOIN users u1 ON r.requested_by = u1.id
      WHERE r.status = 'Pending'
      ORDER BY 
        CASE r.priority
          WHEN 'Urgent' THEN 1
          WHEN 'High' THEN 2
          WHEN 'Medium' THEN 3
          WHEN 'Low' THEN 4
        END,
        r.created_at DESC
      LIMIT 5
    `;

    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error('GET pending requests error:', err);
    res.status(500).json({ error: 'Failed to fetch pending requests', details: err.message });
  }
});

module.exports = router;