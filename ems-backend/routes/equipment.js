const express = require('express');
const { authenticateJWT, checkRole } = require('../middleware/auth');
const pool = require('../config/db');
const router = express.Router();

// Status validation middleware
const validateEquipmentStatus = (req, res, next) => {
  const validStatuses = ['Operational', 'Maintenance', 'Retired'];
  if (req.body.status && !validStatuses.includes(req.body.status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }
  next();
};

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

// routes/equipment.js
router.post('/:id/maintenance', authenticateJWT(), async (req, res) => {
  const { id } = req.params;
  const { maintenance_type, description, date } = req.body;
  
  try {
    // Log the incoming data for debugging
    console.log('Adding maintenance log:', { id, maintenance_type, description, date });
    
    // Insert the data using the correct column names
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

// @desc    Create new equipment
router.post('/', 
  authenticateJWT(), 
  checkRole(['admin', 'manager']), 
  async (req, res) => {
    const { name, description, status = 'available', location } = req.body;
    
    // Basic validation
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
      res.status(201).json(rows[0]);
    } catch (err) {
      console.error('Create equipment error:', err);
      
      if (err.code === '23505') { // Unique violation
        return res.status(400).json({ error: 'Equipment with this name already exists' });
      }
      if (err.code === '23502') { // Not null violation
        return res.status(400).json({ error: 'Required field missing' });
      }
      
      res.status(500).json({ 
        error: 'Failed to create equipment',
        detail: err.message // Include more error details
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
    const { name, description, status, location, last_maintained } = req.body;
    
    try {
      // First verify equipment exists
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
      // Verify equipment exists
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