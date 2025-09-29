const express = require('express');
const { authenticateJWT } = require('../../middleware/auth');
const pool = require('../../config/db');
const router = express.Router();

// Create a unified request - FIXED PATH
router.post('/create', authenticateJWT(), async (req, res) => {
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

// Mixed request v2 - FIXED PATH
router.post('/create/v2', authenticateJWT(), async (req, res) => {
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

// Bulk create equipment requests - FIXED PATH
router.post('/create/bulk', authenticateJWT(), async (req, res) => {
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