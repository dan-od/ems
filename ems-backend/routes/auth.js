const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    console.log('📥 Login attempt received');
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
    
    // 1. Find user
    const userQuery = await pool.query(
      'SELECT * FROM users WHERE email = $1', 
      [email]
    );
    
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
    
    // 3. Create JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        role: user.role,
        department_id: user.department_id
      },
      process.env.JWT_SECRET || 'ems_secret',
      { expiresIn: '8h' }
    );
    
    console.log('✅ JWT created | User:', user.name, '| Role:', user.role);
    
    res.json({ 
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        department_id: user.department_id
      }
    });
    
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ error: 'Login failed', details: err.message });
  }
});

router.post('/logout', (req, res) => {
  console.log('👋 User logged out');
  res.status(200).json({ message: "Logged out successfully" });
});

module.exports = router;