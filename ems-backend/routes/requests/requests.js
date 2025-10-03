const express = require('express');
const { authenticateJWT, checkRole } = require('../../middleware/auth');
const pool = require('../../config/db');
const router = express.Router();

// Create a unified request (handles PPE, Material, Equipment, Transport, Maintenance)
router.post('/', authenticateJWT(), async (req, res) => {
  console.log("\n==================== [REQUESTS] CREATE START ====================");
  console.log("📥 Payload:", JSON.stringify(req.body, null, 2));
  console.log("👤 User:", req.user);

  const { request_type, priority, subject, description, lines } = req.body;
  const userId = req.user.id;

  // --- normalize priority ---
  const normalizePriority = (p) => {
    if (!p) return "Medium";
    const val = p.toString().toLowerCase();
    if (["low", "medium", "high", "urgent"].includes(val)) {
      return val.charAt(0).toUpperCase() + val.slice(1);
    }
    return "Medium";
  };
  const cleanPriority = normalizePriority(priority);

  if (!request_type) {
    console.warn("⚠️ Missing request_type");
    return res.status(400).json({ error: "request_type is required" });
  }
  if (!Array.isArray(lines) || lines.length === 0) {
    console.warn("⚠️ No lines provided");
    return res.status(400).json({ error: "At least one line item is required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    console.log("🔄 Transaction started");

    // 1. Lookup mapped department
    const deptRes = await client.query(
      `SELECT department_id FROM request_type_departments WHERE request_type = $1 LIMIT 1`,
      [request_type]
    );
    console.log("🔎 Dept lookup result:", deptRes.rows);

    if (!deptRes.rows.length) {
      await client.query("ROLLBACK");
      console.error("❌ No department mapped for:", request_type);
      return res.status(400).json({ error: `No department mapped for type: ${request_type}` });
    }
    const departmentId = deptRes.rows[0].department_id;

    // 2. Insert into requests (header)
    const reqRes = await client.query(
      `INSERT INTO requests 
         (requested_by, subject, description, priority, request_type, department_id, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,'Pending',NOW(),NOW())
       RETURNING id, subject, priority, request_type, status`,
      [
        userId,
        subject || `${request_type} Request`,
        description || null,
        cleanPriority,  // ✅ normalized value
        request_type,
        departmentId,
      ]
    );
    const requestId = reqRes.rows[0].id;
    console.log("📝 Request header inserted with ID:", requestId);

    // 3. Insert each line into request_lines
    for (const [idx, line] of lines.entries()) {
      console.log(`➡️ Preparing line ${idx + 1}:`, line);

      const itemName = line.name || line.equipment_name || line.vehicle_type || "Item";
      const qty = Number(line.quantity || line.qty || 1);
      console.log(`   ↳ item_name=${itemName}, qty=${qty}`);

      let extraData = null;
      try {
        extraData = JSON.stringify(line);
      } catch (err) {
        console.error("❌ Failed to stringify line", line, err);
      }

      await client.query(
        `INSERT INTO request_lines (request_id, item_name, requested_qty, extra_data, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [requestId, itemName, qty, extraData]
      );
    }

    await client.query("COMMIT");
    console.log("✅ Transaction committed");
    console.log("==================== [REQUESTS] CREATE END ====================\n");

    return res.status(201).json({
      ...reqRes.rows[0],
      lines,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Create request error:", err);
    res.status(500).json({ error: "Failed to create request", details: err.message });
  } finally {
    client.release();
  }
});



/**
 * Get all requests (with optional ?type= filter)
 * Managers only see requests for their department.
 */
router.get('/', authenticateJWT(), async (req, res) => {
  const { type } = req.query;
  const user = req.user;

  try {
    let query, params;

    if (user.role === 'manager') {
      if (type) {
        query = `SELECT * FROM requests WHERE department_id = $1 AND request_type = $2 ORDER BY created_at DESC`;
        params = [user.department_id, type];
      } else {
        query = `SELECT * FROM requests WHERE department_id = $1 ORDER BY created_at DESC`;
        params = [user.department_id];
      }
    } else {
      if (type) {
        query = `SELECT * FROM requests WHERE request_type = $1 ORDER BY created_at DESC`;
        params = [type];
      } else {
        query = `SELECT * FROM requests ORDER BY created_at DESC`;
        params = [];
      }
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching requests:', err);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

/**
 * Approve a request
 */
router.patch('/:id/approve', authenticateJWT(), checkRole(['admin', 'manager']), async (req, res) => {
  const requestId = req.params.id;
  const userId = req.user.id;

  try {
    await pool.query('BEGIN');

    const { rows } = await pool.query(
      `UPDATE requests 
       SET status = 'Approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [userId, requestId]
    );
    if (!rows.length) throw new Error('Request not found');

    await pool.query(
      `INSERT INTO request_approvals (request_id, department_id, approved_by, status)
       VALUES ($1, $2, $3, 'approved')`,
      [requestId, rows[0].department_id, userId]
    );

    await pool.query('COMMIT');
    res.json({ message: 'Request approved', request: rows[0] });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('❌ Approve request error:', err);
    res.status(500).json({ error: 'Failed to approve request', details: err.message });
  }
});

/**
 * Reject a request
 */
router.patch('/:id/reject', authenticateJWT(), checkRole(['admin', 'manager']), async (req, res) => {
  const requestId = req.params.id;
  const userId = req.user.id;
  const { notes } = req.body;

  try {
    await pool.query('BEGIN');

    const { rows } = await pool.query(
      `UPDATE requests 
       SET status = 'Rejected', approved_by = $1, approved_at = NOW(), updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [userId, requestId]
    );
    if (!rows.length) throw new Error('Request not found');

    await pool.query(
      `INSERT INTO request_approvals (request_id, department_id, approved_by, status, notes)
       VALUES ($1, $2, $3, 'rejected', $4)`,
      [requestId, rows[0].department_id, userId, notes || null]
    );

    await pool.query('COMMIT');
    res.json({ message: 'Request rejected', request: rows[0] });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('❌ Reject request error:', err);
    res.status(500).json({ error: 'Failed to reject request', details: err.message });
  }
});

// Transfer a request to another department
router.patch('/:id/transfer', authenticateJWT(), checkRole(['admin', 'manager']), async (req, res) => {
  const requestId = req.params.id;
  const userId = req.user.id;
  const { targetDepartmentId, notes } = req.body;

  try {
    await pool.query('BEGIN');

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

    if (!rows.length) throw new Error('Request not found');

    await pool.query(
      `INSERT INTO request_approvals (request_id, department_id, approved_by, status, notes)
       VALUES ($1, $2, $3, 'transferred', $4)`,
      [requestId, targetDepartmentId, userId, notes || null]
    );

    await pool.query('COMMIT');
    res.json({ message: 'Request transferred', request: rows[0] });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('❌ Transfer request error:', err);
    res.status(500).json({ error: 'Failed to transfer request', details: err.message });
  }
});


// Get request by ID
router.get('/:id', authenticateJWT(), async (req, res) => {
  try {
    const requestId = req.params.id;

    // Get request
    const { rows } = await pool.query(
      `SELECT r.*, u1.name as requested_by_name, u2.name as approved_by_name,
              CASE WHEN r.is_new_equipment THEN r.new_equipment_name ELSE e.name END as display_name
       FROM requests r
       LEFT JOIN equipment e ON r.equipment_id = e.id
       LEFT JOIN users u1 ON r.requested_by = u1.id
       LEFT JOIN users u2 ON r.approved_by = u2.id
       WHERE r.id = $1`,
      [requestId]
    );

    if (!rows.length) return res.status(404).json({ error: 'Request not found' });

    const request = rows[0];

    // Role filtering
    if (req.user.role === 'manager') {
      // check if manager belongs to same dept as request
      const mgr = await pool.query(`SELECT department_id FROM users WHERE id = $1`, [req.user.id]);
      const managerDept = mgr.rows[0]?.department_id;

      if (request.department_id !== managerDept && request.transferred_to !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to view this request' });
      }
    }

    // engineers and staff can only see their own
    if ((req.user.role === 'engineer' || req.user.role === 'staff') && request.requested_by !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to view this request' });
    }

    res.json(request);
  } catch (err) {
    console.error('GET request error:', err);
    res.status(500).json({ error: 'Failed to fetch request' });
  }
});


// Get pending requests (for dashboard)
// In requests.js, update the pending requests endpoint
router.get('/dashboard/pending', authenticateJWT(), async (req, res) => {
  try {
    // First check if the is_new_equipment column exists
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'requests' 
      AND column_name = 'is_new_equipment'
    `);
    
    const hasNewEquipmentColumn = columnCheck.rows.length > 0;

    let query;
    if (hasNewEquipmentColumn) {
      query = `
        SELECT 
          r.id,
          r.subject,
          r.priority,
          r.created_at,
          CASE 
            WHEN r.is_new_equipment THEN r.new_equipment_name 
            ELSE e.name 
          END as equipment_name,
          u1.name as requested_by_name
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
        LIMIT 5
      `;
    } else {
      query = `
        SELECT 
          r.id,
          r.subject,
          r.priority,
          r.created_at,
          e.name as equipment_name,
          u1.name as requested_by_name
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
        LIMIT 5
      `;
    }

    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error('GET pending requests error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch pending requests',
      details: err.message 
    });
  }
});


// routes/requests.js (append near the bottom)
router.post('/v2', authenticateJWT(), async (req, res) => {
  // payload: { subject?, notes?, lines:[{ itemId, qty }] }
  // We'll map subject -> requests.subject, notes -> requests.description
  const { subject, notes, lines } = req.body;

  if (!Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({ error: 'At least one line is required.' });
  }

  try {
    await pool.query('BEGIN');

    // 1) create request header using your existing columns
    const headerSubject =
      subject && String(subject).trim().length
        ? subject.trim()
        : `Mixed Request (${lines.length} item${lines.length > 1 ? 's' : ''})`;

    const headerDescription = notes || null;

    const reqInsert = await pool.query(
      `INSERT INTO requests (requested_by, subject, description, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id`,
      [req.user.id, headerSubject, headerDescription, 'Pending']
    );
    const requestId = reqInsert.rows[0].id;

    // 2) fetch items so we can copy is_consumable & uom at line-time
    const itemIds = [...new Set(lines.map(l => Number(l.itemId)))];
    const itemsRes = await pool.query(
      `SELECT id, is_consumable, default_uom FROM items WHERE id = ANY($1::int[])`,
      [itemIds]
    );
    const itemMap = new Map(itemsRes.rows.map(r => [Number(r.id), r]));

    // 3) build line rows
    const lineValues = [];
    const params = [];
    let p = 1;

    for (const l of lines) {
      const itemId = Number(l.itemId);
      const qty = Number(l.qty || 1);
      const item = itemMap.get(itemId);

      if (!item) {
        await pool.query('ROLLBACK');
        return res.status(400).json({ error: `Item ${itemId} not found` });
      }
      if (!(qty > 0)) {
        await pool.query('ROLLBACK');
        return res.status(400).json({ error: `Invalid qty for item ${itemId}` });
      }

      // VALUES ($reqId,$itemId,$isConsumable,$qty,$uom,NOW())
      params.push(requestId, itemId, item.is_consumable, qty, item.default_uom);
      lineValues.push(`($${p++}, $${p++}, $${p++}, $${p++}, $${p++}, NOW())`);
    }

    const insertLinesSQL = `
      INSERT INTO request_lines (request_id, item_id, is_consumable, requested_qty, uom, created_at)
      VALUES ${lineValues.join(',')}
      RETURNING *`;
    const linesInsert = await pool.query(insertLinesSQL, params);

    await pool.query('COMMIT');

    return res.status(201).json({
      id: requestId,
      subject: headerSubject,
      description: headerDescription,
      status: 'Pending',
      lines: linesInsert.rows
    });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Create mixed request (v2) error:', err);
    return res.status(500).json({ error: 'Failed to create mixed request', details: err.message });
  }
});


// Get all requests created by the logged-in user (their history)
router.get('/my-requests',
  authenticateJWT(),
  async (req, res) => {
    try {
      console.log('👤 Fetching requests for user:', req.user);

      const { rows } = await pool.query(`
        SELECT 
          r.*,
          u1.name as requested_by_name,
          u2.name as approved_by_name,
          d.name  as department_name,
          td.name as transferred_to_department_name,
          ut.name as transferred_by_name
        FROM requests r
        LEFT JOIN users u1 ON r.requested_by = u1.id
        LEFT JOIN users u2 ON r.approved_by = u2.id
        LEFT JOIN departments d  ON r.department_id = d.id
        LEFT JOIN departments td ON r.transferred_to_department = td.id
        LEFT JOIN users ut ON r.transferred_by = ut.id
        WHERE r.requested_by = $1
        ORDER BY r.created_at DESC
      `, [req.user.id]);

      res.json(rows);
    } catch (err) {
      console.error('❌ Fetch my requests error:', err);
      res.status(500).json({ error: 'Failed to fetch your requests' });
    }
  }
);



/** Bulk create equipment requests **/
router.post('/bulk', authenticateJWT(), async (req, res) => {
  const client = await pool.connect();
  try {
    const { requests } = req.body;
    if (!Array.isArray(requests) || requests.length === 0) {
      return res.status(400).json({ error: 'No requests provided' });
    }

    await client.query('BEGIN');

    const createdRequests = [];

    for (const reqData of requests) {
      const {
        item_id,          // existing equipment id
        custom_name,      // if new equipment
        subject,
        description,
        priority
      } = reqData;

      const result = await client.query(
        `INSERT INTO requests 
          (equipment_id, new_equipment_name, new_equipment_description, is_new_equipment, subject, description, priority, status, requested_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pending', $8, NOW(), NOW())
         RETURNING id, subject, priority, status`,
        [
          item_id || null,
          custom_name || null,
          custom_name ? description : null,
          !!custom_name,  // mark true if new equipment
          subject,
          description,
          priority || 'Medium',
          req.user.id
        ]
      );

      createdRequests.push(result.rows[0]);
    }

    await client.query('COMMIT');
    res.status(201).json({ requests: createdRequests });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Bulk insert error:', err);
    res.status(500).json({ error: 'Failed to create equipment requests' });
  } finally {
    client.release();
  }
});


module.exports = router;