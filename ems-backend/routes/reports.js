const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateJWT } = require('../middleware/auth');

// Get all reports
router.get('/', authenticateJWT(), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.id,
        r.date,
        r.type,
        r.description,
        r.status,
        COALESCE(u.name, 'Unknown') as user
      FROM reports r
      LEFT JOIN users u ON r.user_id = u.id
      ORDER BY r.date DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ message: 'Error fetching reports', error: error.message });
  }
});

// Get reports by date range
router.get('/filter', authenticateJWT(), async (req, res) => {
  const { startDate, endDate, type } = req.query;
  
  try {
    let query = `
      SELECT 
        r.id,
        r.date,
        r.type,
        r.description,
        r.status,
        COALESCE(u.name, 'Unknown') as user
      FROM reports r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;

    if (startDate) {
      query += ` AND r.date >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      query += ` AND r.date <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    if (type) {
      query += ` AND r.type = $${paramCount}`;
      params.push(type);
    }

    query += ` ORDER BY r.date DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error filtering reports:', error);
    res.status(500).json({ message: 'Error filtering reports', error: error.message });
  }
});

module.exports = router; 