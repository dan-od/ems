// backend/routes/user.js

const express    = require('express');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const { authenticateJWT, checkRole } = require('../middleware/auth');
const pool       = require('../config/db');
const router     = express.Router();
const secret     = process.env.JWT_SECRET || 'ems_secret';
const { logActivity, ACTION_TYPES, ENTITY_TYPES, extractUserInfo } = require('../utils/activityLogger');


// Admin creates a new user
router.post('/',
  authenticateJWT(),
  checkRole(['admin']),
  async (req, res) => {
    const adminInfo = extractUserInfo(req);
    const { name, email, role, password, department_id } = req.body;

    console.log('🔹 Creating new user:', { name, email, role, department_id });

    try {
      // Validate required fields
      if (!name || !email || !role || !password) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

        // Validate role
      const validRoles = ['admin', 'manager', 'engineer', 'staff'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ 
          error: `Invalid role. Must be one of: ${validRoles.join(', ')}` 
        });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      console.log('✅ Password hashed successfully');

      const { rows } = await pool.query(
        `INSERT INTO users 
         (name, email, password, role, department_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id, name, email, role, department_id`,
        [name, email, hashedPassword, role, department_id]
      );

      const newUser = rows[0];
      
      // ✅ LOG USER CREATION
      await logActivity({
        ...adminInfo,
        actionType: ACTION_TYPES.USER_CREATED,
        entityType: ENTITY_TYPES.USER,
        entityId: newUser.id,
        entityName: newUser.name,
        description: `Created user account: ${newUser.name} (${newUser.email}) as ${newUser.role}`,
        metadata: {
          email: newUser.email,
          role: newUser.role,
          department_id: newUser.department_id
        }
      });

      console.log('✅ User created successfully:', rows[0]);
      return res.status(201).json({ user: rows[0] });

    } catch (err) {
      console.error('❌ Create user error details:', {
        code: err.code,
        message: err.message,
        detail: err.detail
      });
      
      if (err.code === '23505') { // Unique violation
        return res.status(400).json({ error: 'Email already exists' });
      }
      if (err.code === '23503') { // Foreign key violation
        return res.status(400).json({ error: 'Invalid department ID' });
      }
      return res.status(500).json({ error: 'Failed to create user: ' + err.message });
    }
  }
);

/**
 * 2️⃣ User changes their own password */
router.post('/change-password',
  authenticateJWT(),
  async (req, res) => {
    const token      = req.header('Authorization')?.split(' ')[1];
    const { currentPassword, newPassword } = req.body;

    let userId;
    try {
      const decoded = jwt.verify(token, secret);
      userId = decoded.id;
    } catch {
      return res.sendStatus(403);
    }

    try {
      // fetch stored hash
      const u = await pool.query(
        'SELECT password FROM users WHERE id = $1',
        [userId]
      );
      if (!u.rows.length) {
        return res.status(404).json({ error: 'User not found' });
      }

      const match = await bcrypt.compare(currentPassword, u.rows[0].password);
      if (!match) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // update to new hash
      const newHash = await bcrypt.hash(newPassword, 12);
      await pool.query(
        `UPDATE users
           SET password = $1,
               updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [newHash, userId]
      );

      return res.json({ message: 'Password changed successfully' });
    } catch (err) {
      console.error('Change password error:', err);
      return res.status(500).json({ error: 'Failed to change password' });
    }
  }
);

// Get all users (with department)
router.get('/', authenticateJWT(), checkRole(['admin']), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, d.name AS department
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      ORDER BY u.id ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Fetch users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});


/**
 * 3️⃣ Admin impersonates another user
 */
router.post('/impersonate',
  authenticateJWT(),
  checkRole(['admin']),
  async (req, res) => {
    const { userId } = req.body;
    try {
      const u = await pool.query(
        `SELECT id, name, email, role 
           FROM users 
          WHERE id = $1`,
        [userId]
      );
      if (!u.rows.length) {
        return res.status(404).json({ error: 'User not found' });
      }
      const user = u.rows[0];

      // issue a JWT on behalf of that user
      const token = jwt.sign({
        id:              user.id,
        role:            user.role,
        isImpersonating: true,
        originalUserId:  req.user.id
      }, secret, { expiresIn: '2h' });

      return res.json({ token, user });
    } catch (err) {
      console.error('Impersonate error:', err);
      return res.status(500).json({ error: 'Failed to impersonate user' });
    }
  }
);

// Update user (admin only)
router.put('/:id', authenticateJWT(), checkRole(['admin']), async (req, res) => {
  const userId = req.params.id;
  const adminInfo = extractUserInfo(req);
  const { name, email, role, department_id } = req.body;
  
  try {
    // Get old values
    const oldUser = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (!oldUser.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const { rows } = await pool.query(
      `UPDATE users
       SET name = $1, email = $2, role = $3, department_id = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING id, name, email, role, department_id`,
      [name, email, role, department_id, userId]
    );
    
    const updatedUser = rows[0];
    
    // Build changes
    const changes = {};
    if (name !== oldUser.rows[0].name) changes.name = { old: oldUser.rows[0].name, new: name };
    if (email !== oldUser.rows[0].email) changes.email = { old: oldUser.rows[0].email, new: email };
    if (role !== oldUser.rows[0].role) changes.role = { old: oldUser.rows[0].role, new: role };
    
    // ✅ LOG USER MODIFICATION
    await logActivity({
      ...adminInfo,
      actionType: ACTION_TYPES.USER_MODIFIED,
      entityType: ENTITY_TYPES.USER,
      entityId: updatedUser.id,
      entityName: updatedUser.name,
      description: `Modified user account: ${updatedUser.name}`,
      metadata: { changes }
    });
    
    res.json({ user: updatedUser });
  } catch (err) {
    console.error('❌ Update user error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (admin only) - reassign to Deleted User
router.delete('/:id',
  authenticateJWT(),
  checkRole(['admin']),
  async (req, res) => {
    const client = await pool.connect();
    const userId = req.params.id;
    const adminInfo = extractUserInfo(req);
    
    try {
      await client.query('BEGIN');

      // Find Deleted User
      const { rows: deletedUserRows } = await client.query(
        `SELECT id FROM users WHERE email = 'deleted@system.local' LIMIT 1`
      );

      if (!deletedUserRows.length) {
        return res.status(500).json({ error: "Deleted User not found in DB" });
      }
      const deletedUserId = deletedUserRows[0].id;

      // Reassign equipment
      await client.query(
        'UPDATE equipment SET added_by = $1 WHERE added_by = $2',
        [deletedUserId, req.params.id]
      );

      // Reassign requests
      await client.query(
        'UPDATE requests SET requested_by = $1 WHERE requested_by = $2',
        [deletedUserId, req.params.id]
      );

      // Reassign approvals
      await client.query(
        'UPDATE requests SET approved_by = $1 WHERE approved_by = $2',
        [deletedUserId, req.params.id]
      );

      // Reassign logs (optional if logs table exists)
      await client.query(
        'UPDATE logs SET user_id = $1 WHERE user_id = $2',
        [deletedUserId, req.params.id]
      );

      // Finally delete the user
      const { rowCount } = await client.query(
        'DELETE FROM users WHERE id = $1',
        [req.params.id]
      );

      await client.query('COMMIT');

      if (rowCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        message: 'User deleted successfully and records reassigned to Deleted User'
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ Delete user error:', err);
      res.status(500).json({ error: 'Failed to delete user' });
    } finally {
      client.release();
    }
  }
);


module.exports = router;
