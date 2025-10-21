// ems-backend/routes/maintenance.js
// Department-based access control for maintenance logs

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateJWT } = require('../middleware/auth');
const { logActivity, ACTION_TYPES, ENTITY_TYPES, extractUserInfo } = require('../utils/activityLogger');

/**
 * @route   GET /api/maintenance/logs
 * @desc    Get all maintenance logs (department-filtered for non-admins)
 * @access  All authenticated users
 * 
 * ACCESS RULES:
 * - Admin: See ALL logs across all departments
 * - Manager: See only their department's equipment logs
 * - Engineer: See only their department's equipment logs
 * - Staff: See only their department's equipment logs
 */
router.get('/logs', authenticateJWT(), async (req, res) => {
  try {
    const { role, department_id, id: userId } = req.user;
    const { limit = 50, offset = 0, equipment_id, maintenance_type } = req.query;

    console.log(`\n📋 [MAINTENANCE LOGS] User #${userId} (${role}) requesting logs`);
    
    let query = `
      SELECT 
        ml.*,
        e.name as equipment_name,
        e.serial_number as equipment_serial,
        e.department_id as equipment_department_id,
        d.name as department_name,
        u.name as performed_by_user
      FROM maintenance_logs ml
      LEFT JOIN equipment e ON ml.equipment_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN users u ON ml.performed_by = u.id
      WHERE 1=1
    `;

    const queryParams = [];
    let paramIndex = 1;

    // ROLE-BASED FILTERING
    if (role !== 'admin') {
      // Non-admin users: Only see logs from their department's equipment
      if (!department_id) {
        return res.status(403).json({ 
          error: 'Department information missing. Please contact admin.' 
        });
      }
      
      query += ` AND e.department_id = $${paramIndex}`;
      queryParams.push(department_id);
      paramIndex++;
      
      console.log(`   ✓ Filtered to department #${department_id}`);
    } else {
      console.log(`   ✓ Admin viewing all departments`);
    }

    // ADDITIONAL FILTERS (applied within user's scope)
    if (equipment_id) {
      query += ` AND ml.equipment_id = $${paramIndex}`;
      queryParams.push(parseInt(equipment_id));
      paramIndex++;
    }

    if (maintenance_type) {
      query += ` AND ml.maintenance_type = $${paramIndex}`;
      queryParams.push(maintenance_type);
      paramIndex++;
    }

    // ORDER AND PAGINATION
    query += ` ORDER BY ml.date DESC, ml.created_at DESC`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(parseInt(limit), parseInt(offset));

    const { rows } = await pool.query(query, queryParams);

    // GET TOTAL COUNT (with same filters)
    let countQuery = `
      SELECT COUNT(*) as total
      FROM maintenance_logs ml
      LEFT JOIN equipment e ON ml.equipment_id = e.id
      WHERE 1=1
    `;
    
    const countParams = [];
    let countParamIndex = 1;
    
    if (role !== 'admin' && department_id) {
      countQuery += ` AND e.department_id = $${countParamIndex}`;
      countParams.push(department_id);
      countParamIndex++;
    }
    
    if (equipment_id) {
      countQuery += ` AND ml.equipment_id = $${countParamIndex}`;
      countParams.push(parseInt(equipment_id));
      countParamIndex++;
    }
    
    if (maintenance_type) {
      countQuery += ` AND ml.maintenance_type = $${countParamIndex}`;
      countParams.push(maintenance_type);
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].total);

    console.log(`   ✓ Returning ${rows.length} logs (total: ${totalCount})`);

    res.json({
      logs: rows,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + rows.length < totalCount
      },
      userRole: role,
      departmentId: department_id
    });

  } catch (err) {
    console.error('❌ Get maintenance logs error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch maintenance logs',
      details: err.message 
    });
  }
});

/**
 * @route   GET /api/maintenance/logs/stats
 * @desc    Get maintenance statistics (department-scoped)
 * @access  All authenticated users
 */
router.get('/logs/stats', authenticateJWT(), async (req, res) => {
  try {
    const { role, department_id } = req.user;

    let whereClause = '1=1';
    const queryParams = [];

    // Non-admin users only see their department stats
    if (role !== 'admin' && department_id) {
      whereClause = 'e.department_id = $1';
      queryParams.push(department_id);
    }

    const statsQuery = `
      SELECT 
        COUNT(*) as total_logs,
        COUNT(CASE WHEN ml.maintenance_type = 'Preventive' THEN 1 END) as preventive_count,
        COUNT(CASE WHEN ml.maintenance_type = 'Repair' THEN 1 END) as repair_count,
        COUNT(CASE WHEN ml.maintenance_type = 'Inspection' THEN 1 END) as inspection_count,
        COUNT(CASE WHEN ml.date >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as this_month_count,
        COUNT(CASE WHEN ml.date >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as this_week_count,
        COUNT(DISTINCT ml.equipment_id) as equipment_serviced_count
      FROM maintenance_logs ml
      LEFT JOIN equipment e ON ml.equipment_id = e.id
      WHERE ${whereClause}
    `;

    const { rows } = await pool.query(statsQuery, queryParams);

    res.json(rows[0] || {});

  } catch (err) {
    console.error('❌ Get maintenance stats error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch maintenance statistics',
      details: err.message 
    });
  }
});

/**
 * @route   GET /api/maintenance/logs/:id
 * @desc    Get single maintenance log detail
 * @access  All authenticated users (department-scoped for non-admins)
 */
router.get('/logs/:id', authenticateJWT(), async (req, res) => {
  try {
    const { role, department_id } = req.user;
    const logId = req.params.id;

    const { rows } = await pool.query(`
      SELECT 
        ml.*,
        e.name as equipment_name,
        e.serial_number as equipment_serial,
        e.department_id as equipment_department_id,
        d.name as department_name,
        u.name as performed_by_user
      FROM maintenance_logs ml
      LEFT JOIN equipment e ON ml.equipment_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN users u ON ml.performed_by = u.id
      WHERE ml.id = $1
    `, [logId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Maintenance log not found' });
    }

    const log = rows[0];

    // ACCESS CONTROL
    if (role !== 'admin') {
      if (log.equipment_department_id !== department_id) {
        return res.status(403).json({ 
          error: 'Not authorized to view this maintenance log. It belongs to another department.' 
        });
      }
    }

    res.json(log);

  } catch (err) {
    console.error('❌ Get single maintenance log error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch maintenance log',
      details: err.message 
    });
  }
});

/**
 * @route   POST /api/maintenance/logs
 * @desc    Create new maintenance log entry
 * @access  Engineer, Manager, Admin (for their department's equipment)
 */
router.post('/logs', authenticateJWT(), async (req, res) => {
  try {
    const userInfo = extractUserInfo(req);
    const { role, department_id, id: userId } = req.user;
    const {
      equipment_id,
      maintenance_type,
      description,
      date,
      hours_at_service,
      performed_by,
      cost,
      parts_used,
      next_service_hours
    } = req.body;

    // Validate required fields
    if (!equipment_id || !maintenance_type || !description || !date) {
      return res.status(400).json({ 
        error: 'Missing required fields: equipment_id, maintenance_type, description, date' 
      });
    }

    // Check if equipment exists and user has access to it
    const equipmentCheck = await pool.query(
      'SELECT id, department_id, name FROM equipment WHERE id = $1',
      [equipment_id]
    );

    if (equipmentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    const equipment = equipmentCheck.rows[0];

    // ACCESS CONTROL: Non-admins can only log maintenance for their department's equipment
    if (role !== 'admin' && equipment.department_id !== department_id) {
      return res.status(403).json({ 
        error: `You can only create maintenance logs for equipment in your department.` 
      });
    }

    // INSERT LOG
    const { rows } = await pool.query(`
      INSERT INTO maintenance_logs (
        equipment_id,
        maintenance_type,
        description,
        date,
        hours_at_service,
        performed_by,
        cost,
        parts_used,
        next_service_hours,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      equipment_id,
      maintenance_type,
      description,
      date,
      hours_at_service || null,
      performed_by || null,
      cost || null,
      parts_used || null,
      next_service_hours || null,
      userId
    ]);

    const newLog = rows[0];
    
    // ✅ LOG MAINTENANCE ENTRY
    await logActivity({
      ...userInfo,
      actionType: ACTION_TYPES.MAINTENANCE_LOGGED,
      entityType: ENTITY_TYPES.MAINTENANCE_LOG,
      entityId: newLog.id,
      entityName: `${equipment.name} - ${maintenance_type}`,
      description: `Logged ${maintenance_type} maintenance for ${equipment.name}`,
      metadata: {
        equipment_id: equipment_id,
        equipment_name: equipment.name,
        maintenance_type: maintenance_type,
        hours_at_service: hours_at_service,
        description: description.substring(0, 100)
      }
    });

    console.log(`✅ Created maintenance log #${rows[0].id} for equipment "${equipment.name}"`);

    // TODO: Send notification to Operations Manager if needed

    res.status(201).json({
      message: 'Maintenance log created successfully',
      log: rows[0]
    });

  } catch (err) {
    console.error('❌ Create maintenance log error:', err);
    res.status(500).json({ 
      error: 'Failed to create maintenance log',
      details: err.message 
    });
  }
});

module.exports = router;