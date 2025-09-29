const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateJWT } = require('../middleware/auth');

/**
 * POST /api/issues
 * Payload:
 * {
 *   "requestId": 25,
 *   "waybillNo": "WB-1001",
 *   "lines": [
 *     { "requestLineId": 3, "itemId": 1, "qty": 4 },      // consumable
 *     { "requestLineId": 4, "itemId": 2, "assetId": 1 }   // non-consumable
 *   ]
 * }
 */
router.post('/', authenticateJWT(), async (req, res) => {
  const { requestId, waybillNo, lines } = req.body;
  if (!requestId || !Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({ error: 'requestId and at least one line are required.' });
  }

  try {
    await pool.query('BEGIN');

    // Create issue header
    const issueRes = await pool.query(
      `INSERT INTO issues (request_id, issued_by, waybill_no, issued_at)
       VALUES ($1,$2,$3, NOW()) RETURNING id`,
      [requestId, req.user.id, waybillNo || null]
    );
    const issueId = issueRes.rows[0].id;

    // Load request lines for validation
    const reqLineIds = lines.map(l => Number(l.requestLineId));
    const rlRes = await pool.query(
      `SELECT id, item_id, is_consumable, uom
         FROM request_lines
        WHERE id = ANY($1::int[])`,
      [reqLineIds]
    );
    const rlMap = new Map(rlRes.rows.map(r => [Number(r.id), r]));

    // Process each line
    for (const L of lines) {
      const rl = rlMap.get(Number(L.requestLineId));
      if (!rl) throw new Error(`Request line ${L.requestLineId} not found`);
      if (rl.item_id !== Number(L.itemId)) throw new Error(`Item mismatch on line ${rl.id}`);

      if (rl.is_consumable) {
        const qty = Number(L.qty || 0);
        if (qty <= 0) throw new Error(`Invalid qty for consumable line ${rl.id}`);

        // Decrement Base on-hand (location_id = 1)
        const base = await pool.query(
          `INSERT INTO item_locations (item_id, location_id, on_hand_qty, reserved_qty)
           VALUES ($1, 1, 0, 0)
           ON CONFLICT (item_id, location_id) DO UPDATE SET on_hand_qty = item_locations.on_hand_qty
           RETURNING id, on_hand_qty`,
          [rl.item_id]
        );
        const cur = Number(base.rows[0].on_hand_qty);
        if (cur < qty) throw new Error(`Insufficient stock for item ${rl.item_id} (have ${cur}, need ${qty})`);

        await pool.query(
          `UPDATE item_locations SET on_hand_qty = on_hand_qty - $1 WHERE item_id = $2 AND location_id = 1`,
          [qty, rl.item_id]
        );

        const il = await pool.query(
          `INSERT INTO issue_lines (issue_id, request_line_id, item_id, uom, qty)
           VALUES ($1,$2,$3,$4,$5) RETURNING id`,
          [issueId, rl.id, rl.item_id, rl.uom, qty]
        );

        await pool.query(
        `INSERT INTO stock_ledger (item_id, location_id, txn_type, qty_delta, ref_table, ref_id)
        VALUES ($1,1,'ISSUE',$2 * -1,'issue_lines',$3)`,
        [rl.item_id, qty, il.rows[0].id]
        );


      } else {
        const assetId = Number(L.assetId || 0);
        if (!assetId) throw new Error(`assetId required for non-consumable line ${rl.id}`);

        const aRes = await pool.query(
          `SELECT id, item_id, status, location_id FROM assets WHERE id = $1`,
          [assetId]
        );
        if (!aRes.rows.length) throw new Error('Asset not found');
        const asset = aRes.rows[0];
        if (asset.item_id !== rl.item_id) throw new Error('Asset is not of this item');
        if (asset.status !== 'Ready') throw new Error('Asset is not available');

        const il = await pool.query(
          `INSERT INTO issue_lines (issue_id, request_line_id, item_id, asset_id)
           VALUES ($1,$2,$3,$4) RETURNING id`,
          [issueId, rl.id, rl.item_id, assetId]
        );

        await pool.query(`UPDATE assets SET status='Issued' WHERE id=$1`, [assetId]);

        // Optional zero-qty ledger for traceability
        await pool.query(
          `INSERT INTO stock_ledger (item_id, location_id, txn_type, qty_delta, ref_table, ref_id)
           VALUES ($1,$2,'ISSUE',0,'issue_lines',$3)`,
          [rl.item_id, asset.location_id || 1, il.rows[0].id]
        );
      }
    }

    await pool.query('COMMIT');
    return res.status(201).json({ id: issueId });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Issue create error:', err);
    return res.status(400).json({ error: err.message });
  }
});

module.exports = router;
