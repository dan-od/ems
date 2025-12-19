const express = require('express');
const { authenticateJWT, checkRole } = require('../../middleware/auth');
const pool = require('../../config/db');
const router = express.Router();

/* ===============================================================
   0) HELPERS
================================================================ */
const normalizePriority = (p) => {
  if (!p) return "Medium";
  const val = p.toString().toLowerCase();
  if (["low", "medium", "high", "urgent"].includes(val)) {
    return val.charAt(0).toUpperCase() + val.slice(1);
  }
  return "Medium";
};


/* ===============================================================
   1) GET REQUEST BY ID  🔥 — DEBE IR PRIMERO
================================================================ */
router.get('/:id', authenticateJWT(), async (req, res) => {
  console.log("📄 Fetching request details…");

  const requestId = parseInt(req.params.id, 10);
  const user = req.user;

  if (isNaN(requestId)) {
    return res.status(400).json({ error: "Request ID must be numeric" });
  }

  try {
    const { rows } = await pool.query(
      `SELECT r.*, 
              u1.name AS requested_by_name,
              u2.name AS approved_by_name,
              CASE WHEN r.is_new_equipment THEN r.new_equipment_name ELSE e.name END AS display_name
       FROM requests r
       LEFT JOIN equipment e ON r.equipment_id = e.id
       LEFT JOIN users u1 ON r.requested_by = u1.id
       LEFT JOIN users u2 ON r.approved_by = u2.id
       WHERE r.id = $1`,
      [requestId]
    );

    if (!rows.length)
      return res.status(404).json({ error: "Request not found" });

    const request = rows[0];

    // ---------------------------
    // AUTHORIZATION FIX
    // ---------------------------
    if (user.role === "admin") return res.json(request);

    if (user.id === request.requested_by) return res.json(request);

    if (user.role === "manager") {
      const managerDept = user.department_id;
      const inSameDept = request.department_id === managerDept;
      const transferredToThem = request.transferred_to_department === managerDept;
      const involved = (request.approved_by === user.id || request.transferred_by === user.id);

      if (inSameDept || transferredToThem || involved) {
        return res.json(request);
      }

      return res.status(403).json({
        error: "Not authorized",
        message: "Manager cannot view requests from other departments"
      });
    }

    if (user.role === "engineer" && request.requested_by !== user.id) {
      return res.status(403).json({ error: "Not authorized" });
    }

    return res.json(request);

  } catch (err) {
    console.error("❌ GET /:id error:", err);
    res.status(500).json({ error: "Failed to fetch request" });
  }
});


/* ===============================================================
   2) CREATE REQUEST
================================================================ */
router.post('/', authenticateJWT(), async (req, res) => {
  console.log("\n==================== [REQUESTS] CREATE START ====================");
  console.log("📥 Payload:", JSON.stringify(req.body, null, 2));
  console.log("👤 User:", req.user);

  const { request_type, priority, subject, description, lines } = req.body;
  const userId = req.user.id;

  if (!request_type)
    return res.status(400).json({ error: "request_type is required" });

  if (!Array.isArray(lines) || lines.length === 0)
    return res.status(400).json({ error: "At least one line item is required" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const deptRes = await client.query(
      `SELECT department_id FROM request_type_departments WHERE request_type = $1 LIMIT 1`,
      [request_type]
    );

    if (!deptRes.rows.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: `No department mapped for ${request_type}` });
    }

    const departmentId = deptRes.rows[0].department_id;

    const reqRes = await client.query(
      `INSERT INTO requests 
        (requested_by, subject, description, priority, request_type, department_id, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,'Pending',NOW(),NOW())
       RETURNING id, subject, priority, request_type, status`,
      [
        userId,
        subject || `${request_type} Request`,
        description || null,
        normalizePriority(priority),
        request_type,
        departmentId,
      ]
    );

    const requestId = reqRes.rows[0].id;

    for (const line of lines) {
      const itemName = line.name || line.equipment_name || line.vehicle_type || "Item";
      const qty = Number(line.quantity || line.qty || 1);
      const extra = JSON.stringify(line);

      await client.query(
        `INSERT INTO request_lines (request_id, item_name, requested_qty, extra_data, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [requestId, itemName, qty, extra]
      );
    }

    await client.query("COMMIT");

    return res.status(201).json({ ...reqRes.rows[0], lines });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Create request error:", err);
    res.status(500).json({ error: "Failed to create request", details: err.message });
  } finally {
    client.release();
  }
});


/* ===============================================================
   3) GET ALL REQUESTS
================================================================ */
router.get('/', authenticateJWT(), async (req, res) => {
  const { type } = req.query;
  const user = req.user;

  try {
    let query, params;

    if (user.role === 'manager') {
      query = type
        ? `SELECT * FROM requests WHERE department_id = $1 AND request_type = $2 ORDER BY created_at DESC`
        : `SELECT * FROM requests WHERE department_id = $1 ORDER BY created_at DESC`;
      params = type ? [user.department_id, type] : [user.department_id];
    } else {
      query = type
        ? `SELECT * FROM requests WHERE request_type = $1 ORDER BY created_at DESC`
        : `SELECT * FROM requests ORDER BY created_at DESC`;
      params = type ? [type] : [];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);

  } catch (err) {
    console.error('❌ Error fetching requests:', err);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});


/* ===============================================================
   4) APPROVE REQUEST
================================================================ */
router.patch('/:id/approve', authenticateJWT(), checkRole(['admin', 'manager']), async (req, res) => {
  const requestId = req.params.id;
  const userId = req.user.id;

  try {
    await pool.query("BEGIN");

    const { rows } = await pool.query(
      `UPDATE requests 
       SET status = 'Approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [userId, requestId]
    );

    if (!rows.length) throw new Error("Request not found");

    await pool.query(
      `INSERT INTO request_approvals (request_id, department_id, approved_by, status)
       VALUES ($1,$2,$3,'approved')`,
      [requestId, rows[0].department_id, userId]
    );

    await pool.query("COMMIT");
    res.json({ message: "Request approved", request: rows[0] });

  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("❌ Approve error:", err);
    res.status(500).json({ error: "Failed to approve request", details: err.message });
  }
});


/* ===============================================================
   5) REJECT REQUEST
================================================================ */
router.patch('/:id/reject', authenticateJWT(), checkRole(['admin', 'manager']), async (req, res) => {
  const requestId = req.params.id;
  const userId = req.user.id;
  const { notes } = req.body;

  try {
    await pool.query("BEGIN");

    const { rows } = await pool.query(
      `UPDATE requests 
       SET status = 'Rejected', approved_by = $1, approved_at = NOW(), updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [userId, requestId]
    );

    await pool.query(
      `INSERT INTO request_approvals (request_id, department_id, approved_by, status, notes)
       VALUES ($1,$2,$3,'rejected',$4)`,
      [requestId, rows[0].department_id, userId, notes || null]
    );

    await pool.query("COMMIT");
    res.json({ message: "Request rejected", request: rows[0] });

  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("❌ Reject error:", err);
    res.status(500).json({ error: "Failed to reject request" });
  }
});


/* ===============================================================
   6) TRANSFER REQUEST
================================================================ */
router.patch('/:id/transfer', authenticateJWT(), checkRole(['admin', 'manager']), async (req, res) => {
  const requestId = req.params.id;
  const userId = req.user.id;
  const { targetDepartmentId, notes } = req.body;

  try {
    await pool.query("BEGIN");

    const { rows } = await pool.query(
      `UPDATE requests 
       SET department_id = $1,
           transferred_to_department = $1,
           transferred_by = $2,
           transfer_notes = $3,
           transferred_at = NOW(),
           updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [targetDepartmentId, userId, notes || null, requestId]
    );

    await pool.query(
      `INSERT INTO request_approvals (request_id, department_id, approved_by, status, notes)
       VALUES ($1,$2,$3,'transferred',$4)`,
      [requestId, targetDepartmentId, userId, notes || null]
    );

    await pool.query("COMMIT");
    res.json({ message: "Request transferred", request: rows[0] });

  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("❌ Transfer error:", err);
    res.status(500).json({ error: "Failed to transfer request" });
  }
});


/* ===============================================================
   7) PENDING REQUESTS FOR DASHBOARD
================================================================ */
router.get('/dashboard/pending', authenticateJWT(), async (req, res) => {
  try {
    const col = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'requests' AND column_name = 'is_new_equipment'
    `);

    const hasNew = col.rows.length > 0;

    const query = hasNew ?
      `
      SELECT 
        r.id, r.subject, r.priority, r.created_at,
        CASE WHEN r.is_new_equipment THEN r.new_equipment_name ELSE e.name END AS equipment_name,
        u1.name AS requested_by_name
      FROM requests r
      LEFT JOIN equipment e ON r.equipment_id = e.id
      LEFT JOIN users u1 ON r.requested_by = u1.id
      WHERE r.status = 'Pending'
      ORDER BY 
        CASE r.priority
          WHEN 'Urgent' THEN 1
          WHEN 'High' THEN 2
          WHEN 'Medium' THEN 3
          WHEN 'Low' THEN 4
        END,
        r.created_at DESC
      LIMIT 5`
      :
      `
      SELECT 
        r.id, r.subject, r.priority, r.created_at,
        e.name AS equipment_name,
        u1.name AS requested_by_name
      FROM requests r
      LEFT JOIN equipment e ON r.equipment_id = e.id
      LEFT JOIN users u1 ON r.requested_by = u1.id
      WHERE r.status = 'Pending'
      ORDER BY 
        CASE r.priority
          WHEN 'Urgent' THEN 1
          WHEN 'High' THEN 2
          WHEN 'Medium' THEN 3
          WHEN 'Low' THEN 4
        END,
        r.created_at DESC
      LIMIT 5`;

    const result = await pool.query(query);
    res.json(result.rows);

  } catch (err) {
    console.error("❌ GET pending error:", err);
    res.status(500).json({ error: "Failed to fetch pending requests" });
  }
});


module.exports = router;
