const express = require('express');
const r = express.Router();
const pool = require('../config/db');
const { authenticateJWT } = require('../middleware/auth');

/**
 * POST /api/returns
 * Payload:
 * {
 *   "issueId": 1,
 *   "notes": "Back from Well‑7",
 *   "lines": [
 *     { "issueLineId": 2, "assetId": 1, "condition": "OK" },  // non-consumable
 *     { "issueLineId": 1, "qty": 1 }                          // consumable (optional)
 *   ]
 * }
 */
r.post('/', authenticateJWT(), async (req, res) => {
  const { issueId, notes, lines } = req.body;
  if (!issueId || !Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({ error: 'issueId and at least one line are required.' });
  }

  try {
    await pool.query('BEGIN');

    const ret = await pool.query(
      `INSERT INTO returns (issue_id, received_by, received_at, notes)
       VALUES ($1,$2,NOW(),$3) RETURNING id`,
      [issueId, req.user.id, notes || null]
    );
    const returnId = ret.rows[0].id;

    // Load issue lines for validation
    const ilIds = lines.map(l => Number(l.issueLineId));
    const ilRes = await pool.query(
      `SELECT id, item_id, asset_id FROM issue_lines WHERE id = ANY($1::int[])`,
      [ilIds]
    );
    const ilMap = new Map(ilRes.rows.map(r => [Number(r.id), r]));

    for (const L of lines) {
      const il = ilMap.get(Number(L.issueLineId));
      if (!il) throw new Error(`Issue line ${L.issueLineId} not found`);

      if (il.asset_id || L.assetId) {
        // Non-consumable return
        const assetId = il.asset_id || Number(L.assetId);
        const condition = L.condition || 'OK';

        await pool.query(
          `INSERT INTO return_lines (return_id, issue_line_id, item_id, asset_id, condition)
          VALUES ($1,$2,$3,$4,$5)`,
          [returnId, il.id, il.item_id, assetId, condition]
        );

        await pool.query(
          `UPDATE assets SET status = $1 WHERE id = $2`,
          [condition === 'OK' ? 'Ready' : 'Under_Maintenance', assetId]
        );

        await pool.query(
          `INSERT INTO stock_ledger (item_id, location_id, txn_type, qty_delta, ref_table, ref_id)
          VALUES ($1,1,'RETURN',0,'return_lines',$2)`,
          [il.item_id, returnId]
        );

      } else {
        // Consumable return
        const qty = Number(L.qty || 0);
        if (qty <= 0) throw new Error(`Invalid qty for return on line ${il.id}`);

        await pool.query(
          `INSERT INTO return_lines (return_id, issue_line_id, item_id, qty)
          VALUES ($1,$2,$3,$4)`,
          [returnId, il.id, il.item_id, qty]
        );

        await pool.query(
          `INSERT INTO item_locations (item_id, location_id, on_hand_qty, reserved_qty)
          VALUES ($1,1,0,0)
          ON CONFLICT (item_id, location_id) DO UPDATE SET on_hand_qty = item_locations.on_hand_qty`,
          [il.item_id]
        );

        await pool.query(
          `UPDATE item_locations SET on_hand_qty = on_hand_qty + $1 WHERE item_id=$2 AND location_id=1`,
          [qty, il.item_id]
        );

        await pool.query(
          `INSERT INTO stock_ledger (item_id, location_id, txn_type, qty_delta, ref_table, ref_id)
          VALUES ($1,1,'RETURN',$2,'return_lines',$3)`,
          [il.item_id, qty, returnId]
        );
      }

    }



    await pool.query('COMMIT');
    return res.status(201).json({ id: returnId });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Return create error:', err);
    return res.status(400).json({ error: err.message });
  }
});

module.exports = r;