// ems-backend/middleware/auth.js
// ENHANCED VERSION - Includes user details for activity logging

const jwt = require('jsonwebtoken');
const pool = require('../config/db'); // ✅ ADDED for user lookup
const secret = process.env.JWT_SECRET || 'ems_secret';

/**
 * JWT Authentication Middleware - ENHANCED VERSION
 * Now fetches full user details including department info
 */
function authenticateJWT() {
  return async (req, res, next) => { // ✅ Made async
    const header = req.header('Authorization');
    
    if (!header) {
      return res.sendStatus(401);
    }
    
    const token = header.split(' ')[1];
    
    try {
      // Verify JWT
      const decoded = jwt.verify(token, secret);
      
      // ✅ ENHANCEMENT: Fetch fresh user data with department info
      const userQuery = await pool.query(`
        SELECT 
          u.id,
          u.name,
          u.email,
          u.role,
          u.department_id,
          d.name as department_name
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE u.id = $1
      `, [decoded.id]);
      
      if (!userQuery.rows.length) {
        return res.status(403).json({ error: 'User not found' });
      }
      
      const user = userQuery.rows[0];
      
      // Check for temporary password requirement
      if (decoded.is_temp_password && req.path !== '/change-password') {
        return res.status(403).json({
          error: 'PasswordChangeRequired',
          message: 'You must change your temporary password before proceeding',
          token
        });
      }
      
      // Check for impersonation
      if (decoded.isImpersonating) {
        req.isImpersonating = true;
        req.originalUserId = decoded.originalUserId;
      }
      
      // ✅ Attach full user object with all necessary fields
      req.user = {
        id: user.id,
        name: user.name,              // ✅ For activity logging
        email: user.email,
        role: user.role,
        department_id: user.department_id,
        department_name: user.department_name // ✅ For activity logging
      };
      
      console.log(`🔒 [AUTH] User #${user.id} ${user.name} (${user.role}) authenticated`);
      
      next();
      
    } catch (err) {
      console.error('❌ [AUTH] JWT verification failed:', err.message);
      return res.sendStatus(403);
    }
  };
}

/**
 * Role-based access control middleware
 * @param {Array<string>} allowedRoles - Array of role strings (e.g., ['admin', 'manager'])
 */
function checkRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      console.log(`❌ [AUTH] Access denied: User ${req.user.name} (${req.user.role}) attempted to access ${allowedRoles.join(', ')} route`);
      return res.status(403).json({ 
        error: 'Access denied',
        message: `This action requires ${allowedRoles.join(' or ')} role`
      });
    }
    
    next();
  };
}

module.exports = { authenticateJWT, checkRole };