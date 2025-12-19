// ems-backend/routes/requests/index.js
// ============================================================================
// REQUEST ROUTES INDEX - Updated to include Manager Dashboard routes
// ============================================================================

const express = require('express');
const { authenticateJWT } = require('../../middleware/auth');
const pool = require('../../config/db');
const router = express.Router();

console.log('🔧 [REQUESTS] Loading request routes...');

// ==================== BACKWARD COMPATIBILITY ALIASES ====================
// These handle the old URLs the frontend is still calling

// ALIAS 1: GET /my-requests (frontend still uses this)
router.get('/my-requests', authenticateJWT(), async (req, res) => {
  try {
    console.log('🔀 GET /my-requests (backward compatibility)');
    const { rows } = await pool.query(`
      SELECT 
        r.*,
        u1.name as requested_by_name,
        u2.name as approved_by_name,
        d.name  as department_name,
        CASE 
          WHEN r.is_new_equipment THEN r.new_equipment_name 
          ELSE e.name 
        END as equipment_name
      FROM requests r
      LEFT JOIN users u1 ON r.requested_by = u1.id
      LEFT JOIN users u2 ON r.approved_by = u2.id
      LEFT JOIN departments d ON r.department_id = d.id
      LEFT JOIN equipment e ON r.equipment_id = e.id
      WHERE r.requested_by = $1
      ORDER BY r.created_at DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /my-requests error:', err);
    res.status(500).json({ error: 'Failed to fetch requests', details: err.message });
  }
});

// ALIAS 2: POST / (frontend posts to /requests directly)
router.post('/', authenticateJWT(), async (req, res) => {
  console.log('🔀 POST / (backward compatibility)');
  console.log('📥 Body:', req.body);
  
  const { request_type, priority, subject, description, lines } = req.body;
  const userId = req.user.id;

  if (!request_type) {
    return res.status(400).json({ error: "request_type is required" });
  }
  if (!Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({ error: "At least one line item is required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Get department for request type
    const deptRes = await client.query(
      `SELECT department_id FROM request_type_departments WHERE request_type = $1 LIMIT 1`,
      [request_type]
    );

    if (!deptRes.rows.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: `No department mapped for: ${request_type}` });
    }
    const departmentId = deptRes.rows[0].department_id;

    // Normalize priority
    const normalizePriority = (p) => {
      if (!p) return "Medium";
      const val = p.toString().toLowerCase();
      return ["low", "medium", "high", "urgent"].includes(val) 
        ? val.charAt(0).toUpperCase() + val.slice(1) 
        : "Medium";
    };

    // Insert request
    const reqRes = await client.query(
      `INSERT INTO requests 
         (requested_by, subject, description, priority, request_type, department_id, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,'Pending',NOW(),NOW())
       RETURNING *`,
      [userId, subject || `${request_type} Request`, description, normalizePriority(priority), request_type, departmentId]
    );
    const requestId = reqRes.rows[0].id;

    // Insert line items - using correct column names
    for (const line of lines) {
      await client.query(
        `INSERT INTO request_lines (request_id, item_name, requested_qty, extra_data, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [requestId, line.item_name || line.name, Number(line.quantity) || 1, JSON.stringify(line)]
      );
    }

    await client.query("COMMIT");
    console.log(`✅ Request created: #${requestId}`);
    res.status(201).json({ message: "Request created", request: reqRes.rows[0], request_id: requestId });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error('❌ POST / error:', err);
    res.status(500).json({ error: 'Failed to create request', details: err.message });
  } finally {
    client.release();
  }
});

// ==================== LOAD MODULAR ROUTES ====================
// CRITICAL: Load specific routes BEFORE generic :id routes

// 1. Manager Dashboard Routes (MUST BE FIRST!)
try {
  router.use(require('./managerDashboard'));
  console.log('  ✅ Manager Dashboard routes loaded FIRST');
} catch (err) {
  console.error('  ❌ CRITICAL: managerDashboard.js not found!', err.message);
}

// 2. Create Routes  
try {
  router.use(require('./create'));
  console.log('  ✅ Create routes loaded');
} catch (err) {
  console.warn('  ⚠️  No create.js found');
}

// 3. Approval Routes
try {
  router.use(require('./approvals'));
  console.log('  ✅ Approval routes loaded');
} catch (err) {
  console.warn('  ⚠️  No approvals.js found');
}

// 4. My Requests Routes
try {
  router.use(require('./myRequests'));
  console.log('  ✅ My Requests routes loaded');
} catch (err) {
  console.warn('  ⚠️  No myRequests.js found');
}

// 5. Department Requests Routes
try {
  router.use(require('./deptRequests'));
  console.log('  ✅ Department Requests routes loaded');
} catch (err) {
  console.warn('  ⚠️  No deptRequests.js found');
}

// 6. Fetch Routes (MUST BE LAST - has /:id routes)
try {
  router.use(require('./fetch'));
  console.log('  ✅ Fetch routes loaded LAST (has /:id routes)');
} catch (err) {
  console.warn('  ⚠️  No fetch.js found');
}

console.log('✅ [REQUESTS] All request routes loaded\n');

module.exports = router;