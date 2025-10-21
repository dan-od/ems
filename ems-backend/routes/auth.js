// ems-backend/routes/auth.js
// PHASE 1: LOGIN TRACKING INTEGRATED

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { logActivity, ACTION_TYPES } = require('../utils/activityLogger'); // ✅ ADDED
const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    console.log('🔥 Login attempt received');
    console.log('  Content-Type:', req.headers['content-type']);
    console.log('  Body:', req.body);
    
    // Check if body exists
    if (!req.body || Object.keys(req.body).length === 0) {
      console.error('❌ Empty request body');
      return res.status(400).json({ 
        error: 'Request body is empty. Make sure Content-Type is application/json' 
      });
    }

    const { email, password } = req.body;
    
    // Validate inputs
    if (!email || !password) {
      console.error('❌ Missing email or password');
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }
    
    console.log('🔍 Looking up user:', email);
    
    // 1. Find user WITH department info ✅ ENHANCED
    const userQuery = await pool.query(`
      SELECT u.*, d.name as department_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.email = $1
    `, [email]);
    
    if (userQuery.rows.length === 0) {
      console.log('❌ User not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = userQuery.rows[0];
    console.log('✅ User found:', user.name, '| Role:', user.role);
    
    // 2. Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      console.log('❌ Invalid password');
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    console.log('✅ Password verified');
    
    // 3. Create JWT ✅ ENHANCED with department_name
    const token = jwt.sign(
      { 
        id: user.id, 
        name: user.name, // ✅ ADDED
        role: user.role,
        department_id: user.department_id,
        department_name: user.department_name // ✅ ADDED
      },
      process.env.JWT_SECRET || 'ems_secret',
      { expiresIn: '8h' }
    );
    
    console.log('✅ JWT created | User:', user.name, '| Role:', user.role);
    
    // ✅ 4. LOG THE LOGIN ACTIVITY
    await logActivity({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      departmentId: user.department_id,
      departmentName: user.department_name,
      actionType: ACTION_TYPES.LOGIN,
      entityType: null,
      entityId: null,
      entityName: null,
      description: 'Logged into the system',
      metadata: {
        user_agent: req.headers['user-agent'],
        login_time: new Date().toISOString(),
        browser: req.headers['user-agent']?.split(' ')[0] || 'Unknown'
      },
      ipAddress: req.ip
    });
    
    res.json({ 
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        department_id: user.department_id,
        department_name: user.department_name // ✅ ADDED
      }
    });
    
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ error: 'Login failed', details: err.message });
  }
});

router.post('/logout', (req, res) => {
  console.log('👋 User logged out');
  
  // ✅ LOG THE LOGOUT (if user info available)
  // Note: Since logout is client-side token removal, we may not have user context
  // This is here for completeness but may not be called with auth
  
  res.status(200).json({ message: "Logged out successfully" });
});

module.exports = router;