// backend/middleware/auth.js

const jwt     = require('jsonwebtoken');
const secret  = process.env.JWT_SECRET || 'ems_secret';

// Verifies JWT, enforces temp‑password change, and flags impersonation
function authenticateJWT() {
  return (req, res, next) => {
    const header = req.header('Authorization');
    if (!header) return res.sendStatus(401);
    const token = header.split(' ')[1];
    jwt.verify(token, secret, (err, user) => {
      if (err) return res.sendStatus(403);
      // If user is logging in with a temporary password, force change
      if (user.is_temp_password && req.path !== '/change-password') {
        return res.status(403).json({
          error:   'PasswordChangeRequired',
          message: 'You must change your temporary password before proceeding',
          token    // send back so front‑end can use it on change-password
        });
      }
      // If impersonating, flag it
      if (user.isImpersonating) {
        req.isImpersonating = true;
        req.originalUserId  = user.originalUserId;
      }
      req.user = user;
      next();
    });
  };
}

// Checks that current user’s role is in the allowed list
function checkRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
}

module.exports = { authenticateJWT, checkRole };
