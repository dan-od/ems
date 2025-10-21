const express = require('express');
const { authenticateJWT, checkRole } = require('../middleware/auth');
const pool = require('../config/db');
const router = express.Router();
const { logActivity, ACTION_TYPES, ENTITY_TYPES, extractUserInfo } = require('../utils/activityLogger');

// Get all departments
router.get('/', authenticateJWT(), async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM departments ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    console.error('Get departments error:', err);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// Create new department (Admin only)
router.post('/', authenticateJWT(), checkRole(['admin']), async (req, res) => {
  const adminInfo = extractUserInfo(req);
  const { name, description } = req.body;
  
  try {
    const { rows } = await pool.query(
      `INSERT INTO departments (name, description)
       VALUES ($1, $2) RETURNING *`,
      [name, description]
    );
    
    const newDept = rows[0];
    
    // ✅ LOG DEPARTMENT CREATION
    await logActivity({
      ...adminInfo,
      actionType: ACTION_TYPES.DEPARTMENT_CREATED,
      entityType: ENTITY_TYPES.DEPARTMENT,
      entityId: newDept.id,
      entityName: newDept.name,
      description: `Created department: ${newDept.name}`,
      metadata: {
        description: newDept.description
      }
    });
    
    res.status(201).json(newDept);
  } catch (err) {
    console.error('❌ Create department error:', err);
    res.status(500).json({ error: 'Failed to create department' });
  }
});

module.exports = router;
