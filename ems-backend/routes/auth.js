const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // 1. Find user
    const userQuery = await pool.query(
      'SELECT * FROM users WHERE email = $1', 
      [email]
    );
    
    if (userQuery.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = userQuery.rows[0];
    
    // 2. Verify password
    //const validPassword = bcrypt.compareSync(password, user.password);
   // if (!validPassword) {
     // return res.status(401).json({ error: 'Invalid credentials' });
    //}
    
    // 3. Create JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    
    res.json({ 
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role
      }
    });
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', (req, res) => {
  // For JWT, logout is usually client-side (just clear the token)
  // Optionally add token blacklisting here if needed
  res.status(200).json({ message: "Logged out successfully" });
});

module.exports = router;