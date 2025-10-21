const express = require('express');
const { authenticateJWT, checkRole } = require('../middleware/auth');
const pool = require('../config/db');
const router = express.Router();
const { logActivity, ACTION_TYPES, ENTITY_TYPES, extractUserInfo } = require('../utils/activityLogger');

// Status validation middleware
const validateEquipmentStatus = (req, res, next) => {
  const validStatuses = ['Operational', 'Maintenance', 'Retired'];
  if (req.body.status && !validStatuses.includes(req.body.status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }
  next();
};

// ============================================================================
// IMPORTANT: Specific routes MUST come BEFORE parameterized routes like /:id
// ============================================================================

// @desc    Get equipment stats
router.get('/stats', authenticateJWT(), async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(CASE WHEN status = 'Operational' THEN 1 END) as available,
        COUNT(CASE WHEN status = 'Maintenance' THEN 1 END) as maintenance,
        COUNT(CASE WHEN status = 'Retired' THEN 1 END) as retired,
        COALESCE((SELECT COUNT(*) FROM requests WHERE status = 'Pending'), 0) as pending
      FROM equipment
    `);
    
    if (!stats.rows[0]) {
      return res.json({
        available: 0,
        maintenance: 0,
        retired: 0,
        pending: 0
      });
    }
    
    res.json(stats.rows[0]);
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Failed to fetch stats', details: err.message });
  }
});

// ============================================================================
// ENGINEER-SPECIFIC ENDPOINTS - MUST BE BEFORE /:id ROUTE
// ============================================================================

/**
 * @route   GET /api/equipment/my-assigned
 * @desc    Get equipment currently assigned to the logged-in engineer
 * @access  Engineer, Admin
 */
router.get('/my-assigned', authenticateJWT(), async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log(`📦 Fetching assigned equipment for user #${userId}`);

    const { rows } = await pool.query(`
      SELECT 
        e.id,
        e.name,
        e.description,
        e.status,
        e.location as base_location,
        ea.id as assignment_id,
        ea.assigned_at,
        ea.location as current_location,
        ea.notes,
        m.maintenance_type as last_maintenance_type,
        m.date as last_maintenance_date,
        -- Calculate days since last maintenance
        EXTRACT(DAY FROM (NOW() - m.date)) as days_since_maintenance,
        -- Calculate if service is due (example: 30 days)
        CASE 
          WHEN m.date IS NULL THEN false
          WHEN EXTRACT(DAY FROM (NOW() - m.date)) > 30 THEN true
          ELSE false
        END as service_due
      FROM equipment_assignments ea
      INNER JOIN equipment e ON ea.equipment_id = e.id
      LEFT JOIN LATERAL (
        SELECT maintenance_type, date
        FROM maintenance_logs
        WHERE equipment_id = e.id
        ORDER BY date DESC
        LIMIT 1
      ) m ON true
      WHERE ea.assigned_to = $1 
        AND ea.returned_at IS NULL
        AND e.status != 'Retired'
      ORDER BY ea.assigned_at DESC
    `, [userId]);

    console.log(`✅ Found ${rows.length} assigned equipment`);
    res.json(rows);
  } catch (err) {
    console.error('❌ Get my assigned equipment error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch assigned equipment',
      details: err.message 
    });
  }
});

/**
 * @route   GET /api/equipment/assignment-history
 * @desc    Get assignment history for logged-in engineer
 * @access  Engineer, Admin
 */
router.get('/assignment-history', authenticateJWT(), async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;

    const { rows } = await pool.query(`
      SELECT 
        ea.*,
        e.name as equipment_name,
        e.description as equipment_description,
        u.name as assigned_by_name
      FROM equipment_assignments ea
      INNER JOIN equipment e ON ea.equipment_id = e.id
      LEFT JOIN users u ON ea.assigned_by = u.id
      WHERE ea.assigned_to = $1
      ORDER BY ea.assigned_at DESC
      LIMIT $2
    `, [userId, limit]);

    res.json(rows);
  } catch (err) {
    console.error('❌ Get assignment history error:', err);
    res.status(500).json({ error: 'Failed to fetch assignment history' });
  }
});

// ============================================================================
// NOW the parameterized routes can come (they won't catch specific routes above)
// ============================================================================

// @desc    Get all equipment
router.get('/', authenticateJWT(), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT e.*, u.name as added_by_name
      FROM equipment e
      LEFT JOIN users u ON e.added_by = u.id
      ORDER BY e.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET equipment error:', err);
    res.status(500).json({ error: 'Failed to fetch equipment' });
  }
});

// @desc    Get equipment by ID
router.get('/:id', authenticateJWT(), async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(`
      SELECT e.*, u.name as added_by_name
      FROM equipment e
      LEFT JOIN users u ON e.added_by = u.id
      WHERE e.id = $1
    `, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('GET equipment by ID error:', err);
    res.status(500).json({ error: 'Failed to fetch equipment' });
  }
});

// @desc    Get maintenance logs for equipment
router.get('/:id/maintenance', authenticateJWT(), async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(`
      SELECT m.*
      FROM maintenance_logs m
      WHERE m.equipment_id = $1
      ORDER BY m.date DESC
    `, [id]);
    
    res.json(rows);
  } catch (err) {
    console.error('GET maintenance logs error:', err);
    res.status(500).json({ error: 'Failed to fetch maintenance logs' });
  }
});

// @desc    Add maintenance log for equipment
router.post('/:id/maintenance', authenticateJWT(), async (req, res) => {
  const { id } = req.params;
  const { maintenance_type, description, date } = req.body;
  
  try {
    console.log('Adding maintenance log:', { id, maintenance_type, description, date });
    
    const { rows } = await pool.query(
      `INSERT INTO maintenance_logs 
       (equipment_id, maintenance_type, description, date)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, maintenance_type, description, date]
    );
    
    console.log('Maintenance log added successfully:', rows[0]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error adding maintenance log:', err);
    res.status(500).json({ error: 'Failed to add maintenance log', details: err.message });
  }
});

/**
 * @route   POST /api/equipment/:id/report-issue
 * @desc    Quick report equipment issue (creates maintenance request)
 * @access  Engineer
 */
router.post('/:id/report-issue', 
  authenticateJWT(), 
  checkRole(['engineer', 'admin']), 
  async (req, res) => {
    const equipmentId = req.params.id;
    const { issue_description, urgency = 'Medium' } = req.body;
    const userId = req.user.id;

    if (!issue_description || !issue_description.trim()) {
      return res.status(400).json({ error: 'Issue description is required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get user's department
      const userDept = await client.query(
        'SELECT department_id FROM users WHERE id = $1',
        [userId]
      );

      if (!userDept.rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'User department not found' });
      }

      const departmentId = userDept.rows[0].department_id;

      // Create request
      const requestRes = await client.query(
        `INSERT INTO requests (
          requested_by, 
          subject, 
          description, 
          priority, 
          department_id, 
          request_type,
          status,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, 'maintenance', 'Pending', NOW(), NOW())
        RETURNING id`,
        [
          userId,
          `Equipment Issue: ${equipmentId}`,
          issue_description,
          urgency,
          departmentId
        ]
      );

      const requestId = requestRes.rows[0].id;

      // Insert into maintenance_requests if that table exists
      try {
        await client.query(
          `INSERT INTO maintenance_requests (request_id, equipment_id, issue_description, urgency)
           VALUES ($1, $2, $3, $4)`,
          [requestId, equipmentId, issue_description, urgency]
        );
      } catch (err) {
        // Table might not exist, that's okay
        console.log('ℹ️ maintenance_requests table not found, skipping...');
      }

      await client.query('COMMIT');
      
      console.log(`✅ Issue reported for equipment #${equipmentId} - Request #${requestId}`);
      
      res.status(201).json({ 
        message: 'Issue reported successfully',
        request_id: requestId 
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ Report equipment issue error:', err);
      res.status(500).json({ 
        error: 'Failed to report equipment issue',
        details: err.message 
      });
    } finally {
      client.release();
    }
});

// @desc    Create new equipment
router.post('/', 
  authenticateJWT(), 
  checkRole(['admin', 'manager']), 
  async (req, res) => {
    const userInfo = extractUserInfo(req);
    const { name, description, status = 'available', location } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Equipment name is required' });
    }

    try {
      const { rows } = await pool.query(
        `INSERT INTO equipment 
         (name, description, status, location, added_by) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [name, description, status, location, req.user.id]
      );
      
      const newEquipment = rows[0];
    
      // ✅ LOG EQUIPMENT CREATION
      await logActivity({
        ...userInfo,
        actionType: ACTION_TYPES.EQUIPMENT_CREATED,
        entityType: ENTITY_TYPES.EQUIPMENT,
        entityId: newEquipment.id,
        entityName: newEquipment.name,
        description: `Created equipment: ${newEquipment.name}`,
        metadata: {
          status: newEquipment.status,
          location: newEquipment.location
        }
      });
      res.status(201).json(rows[0]);
    } catch (err) {
      console.error('Create equipment error:', err);
      
      if (err.code === '23505') {
        return res.status(400).json({ error: 'Equipment with this name already exists' });
      }
      if (err.code === '23502') {
        return res.status(400).json({ error: 'Required field missing' });
      }
      
      res.status(500).json({ 
        error: 'Failed to create equipment',
        detail: err.message
      });
    }
  }
);

// @desc    Update equipment
router.put('/:id', 
  authenticateJWT(), 
  checkRole(['admin', 'manager']), 
  async (req, res) => {
    const { id } = req.params;
    const userInfo = extractUserInfo(req);
    const { name, description, status, location, last_maintained } = req.body;
    
    try {
      const exists = await pool.query('SELECT id FROM equipment WHERE id = $1', [id]);
      if (exists.rows.length === 0) {
        return res.status(404).json({ error: 'Equipment not found' });
      }

      const { rows } = await pool.query(
        `UPDATE equipment 
         SET name = COALESCE($1, name),
             description = COALESCE($2, description),
             status = COALESCE($3, status),
             location = COALESCE($4, location),
             last_maintained = COALESCE($5, last_maintained),
             updated_at = NOW()
         WHERE id = $6
         RETURNING *`,
        [name, description, status, location, last_maintained, id]
      );

      const updatedEquipment = rows[0];
    
      // Build changes object
      const changes = {};
      if (name && name !== oldEquip.rows[0].name) changes.name = { old: oldEquip.rows[0].name, new: name };
      if (status && status !== oldEquip.rows[0].status) changes.status = { old: oldEquip.rows[0].status, new: status };
      if (location && location !== oldEquip.rows[0].location) changes.location = { old: oldEquip.rows[0].location, new: location };
      
      // ✅ LOG EQUIPMENT MODIFICATION
      await logActivity({
        ...userInfo,
        actionType: ACTION_TYPES.EQUIPMENT_MODIFIED,
        entityType: ENTITY_TYPES.EQUIPMENT,
        entityId: updatedEquipment.id,
        entityName: updatedEquipment.name,
        description: `Modified equipment: ${updatedEquipment.name}`,
        metadata: { changes }
      });
      
      res.json(rows[0]);
    } catch (err) {
      console.error('Update equipment error:', err);
      
      if (err.code === '23505') {
        return res.status(400).json({ error: 'Equipment with this name already exists' });
      }
      
      res.status(500).json({ 
        error: 'Failed to update equipment',
        detail: err.message
      });
    }
  }
);

// @desc    Delete equipment
router.delete('/:id',
  authenticateJWT(),
  checkRole(['admin']),
  async (req, res) => {
    const { id } = req.params;

    try {
      const exists = await pool.query('SELECT id FROM equipment WHERE id = $1', [id]);
      if (exists.rows.length === 0) {
        return res.status(404).json({ error: 'Equipment not found' });
      }

      await pool.query('DELETE FROM equipment WHERE id = $1', [id]);
      res.json({ message: 'Equipment deleted successfully' });
    } catch (err) {
      console.error('DELETE equipment error:', err);
      res.status(500).json({ error: 'Failed to delete equipment' });
    }
  }
);

module.exports = router;