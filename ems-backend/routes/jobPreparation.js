// ems-backend/routes/jobPreparation.js
// =======================================================
// JOB PREPARATION ROUTES
// Handles Pre-Job and Post-Job workflows for field operations
// =======================================================

const express = require('express');
const router = express.Router();
const  pool  = require('../config/db');
const { authenticateJWT, checkRole } = require('../middleware/auth');
const { extractUserInfo } = require('../utils/activityLogger');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// =======================================================
// FILE UPLOAD CONFIGURATION
// =======================================================

// Ensure upload directories exist
const ensureUploadDirs = async () => {
  const dirs = [
    'uploads/job-prep',
    'uploads/prejob-inspections',
    'uploads/postjob-inspections'
  ];
  
  for (const dir of dirs) {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }
};

ensureUploadDirs();

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.body.upload_type || 'job-prep';
    cb(null, `uploads/${type}/`);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WEBP)'));
  }
});

// =======================================================
// 1. GET ALL JOB PREPARATIONS
// =======================================================

router.get('/', authenticateJWT(), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userInfo = extractUserInfo(req);
    const { status, date_from, date_to } = req.query;
    
    let query = `
      SELECT 
        jp.*,
        u.name as created_by_name,
        d.name as department_name,
        r.name as reviewed_by_name,
        (SELECT COUNT(*) FROM job_preparation_items WHERE job_preparation_id = jp.id) as total_items,
        (SELECT COUNT(*) FROM job_preparation_items 
         WHERE job_preparation_id = jp.id AND item_status = 'available') as available_items
      FROM job_preparations jp
      LEFT JOIN users u ON jp.created_by = u.id
      LEFT JOIN departments d ON jp.department_id = d.id
      LEFT JOIN users r ON jp.reviewed_by = r.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    // Role-based filtering
    if (userInfo.role === 'engineer' || userInfo.role === 'staff') {
      query += ` AND jp.created_by = $${paramCount}`;
      params.push(userInfo.userId);
      paramCount++;
    } else if (userInfo.role === 'manager') {
      // Get user's department
      const deptResult = await client.query(
        'SELECT department_id FROM users WHERE id = $1',
        [userInfo.userId]
      );
      const userDeptId = deptResult.rows[0]?.department_id;
      
      if (userDeptId) {
        query += ` AND jp.department_id = $${paramCount}`;
        params.push(userDeptId);
        paramCount++;
      }
    }
    
    // Status filter
    if (status) {
      query += ` AND jp.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
    
    // Date range filter
    if (date_from) {
      query += ` AND jp.planned_start_date >= $${paramCount}`;
      params.push(date_from);
      paramCount++;
    }
    if (date_to) {
      query += ` AND jp.planned_start_date <= $${paramCount}`;
      params.push(date_to);
      paramCount++;
    }
    
    query += ` ORDER BY jp.created_at DESC`;
    
    const result = await client.query(query, params);
    res.json(result.rows);
    
  } catch (err) {
    console.error('❌ Get job preparations error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch job preparations',
      details: err.message 
    });
  } finally {
    client.release();
  }
});

// =======================================================
// 2. GET JOB PREPARATION BY ID
// =======================================================

router.get('/:id', authenticateJWT(), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const userInfo = extractUserInfo(req);
    
    // Get job preparation
    const jobResult = await client.query(`
      SELECT 
        jp.*,
        u.name as created_by_name,
        d.name as department_name,
        r.name as reviewed_by_name
      FROM job_preparations jp
      LEFT JOIN users u ON jp.created_by = u.id
      LEFT JOIN departments d ON jp.department_id = d.id
      LEFT JOIN users r ON jp.reviewed_by = r.id
      WHERE jp.id = $1
    `, [id]);
    
    if (jobResult.rows.length === 0) {
      return res.status(404).json({ error: 'Job preparation not found' });
    }
    
    const job = jobResult.rows[0];
    
    // Authorization check
    if (userInfo.role === 'engineer' || userInfo.role === 'staff') {
      if (job.created_by !== userInfo.userId) {
        return res.status(403).json({ error: 'Not authorized to view this job preparation' });
      }
    } else if (userInfo.role === 'manager') {
      const deptResult = await client.query(
        'SELECT department_id FROM users WHERE id = $1',
        [userInfo.userId]
      );
      const userDeptId = deptResult.rows[0]?.department_id;
      
      if (job.department_id !== userDeptId) {
        return res.status(403).json({ error: 'Not authorized to view this job preparation' });
      }
    }
    
    // Get items
    const itemsResult = await client.query(`
      SELECT 
        jpi.*,
        e.name as equipment_name,
        e.status as equipment_status,
        e.hours_run,
        e.last_service_hours
      FROM job_preparation_items jpi
      LEFT JOIN equipment e ON jpi.equipment_id = e.id
      WHERE jpi.job_preparation_id = $1
      ORDER BY jpi.priority DESC, jpi.created_at ASC
    `, [id]);
    
    // Get pre-job inspections
    const prejobResult = await client.query(`
      SELECT 
        pri.*,
        u.name as inspector_name,
        a.name as approved_by_name
      FROM prejob_inspections pri
      LEFT JOIN users u ON pri.inspector_id = u.id
      LEFT JOIN users a ON pri.approved_by = a.id
      WHERE pri.job_preparation_item_id IN (
        SELECT id FROM job_preparation_items WHERE job_preparation_id = $1
      )
    `, [id]);
    
    // Get post-job inspections
    const postjobResult = await client.query(`
      SELECT 
        poi.*,
        u.name as inspector_name,
        a.name as approved_by_name
      FROM postjob_inspections poi
      LEFT JOIN users u ON poi.inspector_id = u.id
      LEFT JOIN users a ON poi.approved_by = a.id
      WHERE poi.job_preparation_item_id IN (
        SELECT id FROM job_preparation_items WHERE job_preparation_id = $1
      )
    `, [id]);
    
    res.json({
      ...job,
      items: itemsResult.rows,
      prejob_inspections: prejobResult.rows,
      postjob_inspections: postjobResult.rows
    });
    
  } catch (err) {
    console.error('❌ Get job preparation error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch job preparation',
      details: err.message 
    });
  } finally {
    client.release();
  }
});

// =======================================================
// 3. CREATE JOB PREPARATION (DRAFT)
// =======================================================

router.post('/', authenticateJWT(), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const userInfo = extractUserInfo(req);
    const {
      job_name,
      well_name,
      location,
      client_name,
      planned_start_date,
      planned_end_date,
      job_description,
      special_requirements,
      safety_considerations,
      items = []
    } = req.body;
    
    // Validate required fields
    if (!job_name) {
      return res.status(400).json({ error: 'Job name is required' });
    }
    
    // Get user's department
    const deptResult = await client.query(
      'SELECT department_id FROM users WHERE id = $1',
      [userInfo.userId]
    );
    const departmentId = deptResult.rows[0]?.department_id;
    
    if (!departmentId) {
      return res.status(400).json({ error: 'User department not found' });
    }
    
    // Generate job number
    const jobNumber = `JOB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Create job preparation
    const jobResult = await client.query(`
      INSERT INTO job_preparations (
        job_number,
        job_name,
        well_name,
        location,
        client_name,
        planned_start_date,
        planned_end_date,
        job_description,
        special_requirements,
        safety_considerations,
        status,
        created_by,
        department_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'draft', $11, $12)
      RETURNING *
    `, [
      jobNumber,
      job_name,
      well_name,
      location,
      client_name,
      planned_start_date,
      planned_end_date,
      job_description,
      special_requirements,
      safety_considerations,
      userInfo.userId,
      departmentId
    ]);
    
    const job = jobResult.rows[0];
    
    // Add items if provided
    if (items.length > 0) {
      for (const item of items) {
        await client.query(`
          INSERT INTO job_preparation_items (
            job_preparation_id,
            equipment_id,
            custom_item_name,
            item_description,
            quantity,
            unit,
            priority,
            notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          job.id,
          item.equipment_id || null,
          item.custom_item_name || null,
          item.item_description || null,
          item.quantity || 1,
          item.unit || 'piece',
          item.priority || 'normal',
          item.notes || null
        ]);
      }
    }
    
    // Log activity
    await client.query(`
      INSERT INTO job_preparation_history (
        job_preparation_id,
        changed_by,
        change_type,
        new_status,
        notes
      ) VALUES ($1, $2, 'created', 'draft', 'Job preparation created')
    `, [job.id, userInfo.userId]);
    
    await client.query('COMMIT');
    
    console.log(`✅ Job preparation created: ${jobNumber}`);
    res.status(201).json(job);
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Create job preparation error:', err);
    res.status(500).json({ 
      error: 'Failed to create job preparation',
      details: err.message 
    });
  } finally {
    client.release();
  }
});

// =======================================================
// 4. UPDATE JOB PREPARATION (SAVE/AUTOSAVE)
// =======================================================

router.put('/:id', authenticateJWT(), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const userInfo = extractUserInfo(req);
    
    // Check ownership
    const ownerCheck = await client.query(
      'SELECT created_by, status FROM job_preparations WHERE id = $1',
      [id]
    );
    
    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Job preparation not found' });
    }
    
    const job = ownerCheck.rows[0];
    
    // Only creator can edit draft jobs
    if (job.status !== 'draft' && userInfo.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Can only edit draft job preparations'
      });
    }
    
    if (job.created_by !== userInfo.userId && userInfo.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Not authorized to edit this job preparation'
      });
    }
    
    const {
      job_name,
      well_name,
      location,
      client_name,
      planned_start_date,
      planned_end_date,
      job_description,
      special_requirements,
      safety_considerations
    } = req.body;
    
    // Update job
    const updateResult = await client.query(`
      UPDATE job_preparations SET
        job_name = COALESCE($1, job_name),
        well_name = COALESCE($2, well_name),
        location = COALESCE($3, location),
        client_name = COALESCE($4, client_name),
        planned_start_date = COALESCE($5, planned_start_date),
        planned_end_date = COALESCE($6, planned_end_date),
        job_description = COALESCE($7, job_description),
        special_requirements = COALESCE($8, special_requirements),
        safety_considerations = COALESCE($9, safety_considerations),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `, [
      job_name,
      well_name,
      location,
      client_name,
      planned_start_date,
      planned_end_date,
      job_description,
      special_requirements,
      safety_considerations,
      id
    ]);
    
    // Log activity
    await client.query(`
      INSERT INTO job_preparation_history (
        job_preparation_id,
        changed_by,
        change_type,
        notes
      ) VALUES ($1, $2, 'updated', 'Job details updated')
    `, [id, userInfo.userId]);
    
    await client.query('COMMIT');
    
    res.json(updateResult.rows[0]);
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Update job preparation error:', err);
    res.status(500).json({ 
      error: 'Failed to update job preparation',
      details: err.message 
    });
  } finally {
    client.release();
  }
});

// =======================================================
// 5. ADD ITEMS TO JOB PREPARATION
// =======================================================

router.post('/:id/items', authenticateJWT(), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const userInfo = extractUserInfo(req);
    const { items } = req.body;
    
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array is required' });
    }
    
    // Check ownership and status
    const jobCheck = await client.query(
      'SELECT created_by, status FROM job_preparations WHERE id = $1',
      [id]
    );
    
    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Job preparation not found' });
    }
    
    const job = jobCheck.rows[0];
    
    if (job.created_by !== userInfo.userId && userInfo.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    if (job.status !== 'draft') {
      return res.status(400).json({ 
        error: 'Can only add items to draft jobs'
      });
    }
    
    // Insert items
    const insertedItems = [];
    for (const item of items) {
      const result = await client.query(`
        INSERT INTO job_preparation_items (
          job_preparation_id,
          equipment_id,
          custom_item_name,
          item_description,
          quantity,
          unit,
          priority,
          notes,
          substitute_item
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        id,
        item.equipment_id || null,
        item.custom_item_name || null,
        item.item_description || null,
        item.quantity || 1,
        item.unit || 'piece',
        item.priority || 'normal',
        item.notes || null,
        item.substitute_item || null
      ]);
      
      insertedItems.push(result.rows[0]);
    }
    
    await client.query('COMMIT');
    
    res.status(201).json(insertedItems);
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Add items error:', err);
    res.status(500).json({ 
      error: 'Failed to add items',
      details: err.message 
    });
  } finally {
    client.release();
  }
});

// =======================================================
// 6. UPDATE/DELETE ITEM
// =======================================================

router.put('/:jobId/items/:itemId', authenticateJWT(), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { jobId, itemId } = req.params;
    const userInfo = extractUserInfo(req);
    
    // Check authorization
    const jobCheck = await client.query(
      'SELECT created_by, status FROM job_preparations WHERE id = $1',
      [jobId]
    );
    
    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    const job = jobCheck.rows[0];
    
    if (job.created_by !== userInfo.userId && userInfo.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const {
      quantity,
      unit,
      priority,
      notes,
      item_status
    } = req.body;
    
    const result = await client.query(`
      UPDATE job_preparation_items SET
        quantity = COALESCE($1, quantity),
        unit = COALESCE($2, unit),
        priority = COALESCE($3, priority),
        notes = COALESCE($4, notes),
        item_status = COALESCE($5, item_status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6 AND job_preparation_id = $7
      RETURNING *
    `, [quantity, unit, priority, notes, item_status, itemId, jobId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json(result.rows[0]);
    
  } catch (err) {
    console.error('❌ Update item error:', err);
    res.status(500).json({ 
      error: 'Failed to update item',
      details: err.message 
    });
  } finally {
    client.release();
  }
});

router.delete('/:jobId/items/:itemId', authenticateJWT(), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { jobId, itemId } = req.params;
    const userInfo = extractUserInfo(req);
    
    // Check authorization
    const jobCheck = await client.query(
      'SELECT created_by, status FROM job_preparations WHERE id = $1',
      [jobId]
    );
    
    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    const job = jobCheck.rows[0];
    
    if (job.created_by !== userInfo.userId && userInfo.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    if (job.status !== 'draft') {
      return res.status(400).json({ error: 'Can only delete items from draft jobs' });
    }
    
    await client.query(
      'DELETE FROM job_preparation_items WHERE id = $1 AND job_preparation_id = $2',
      [itemId, jobId]
    );
    
    res.json({ message: 'Item deleted successfully' });
    
  } catch (err) {
    console.error('❌ Delete item error:', err);
    res.status(500).json({ 
      error: 'Failed to delete item',
      details: err.message 
    });
  } finally {
    client.release();
  }
});

// =======================================================
// 7. SUBMIT FOR APPROVAL
// =======================================================

router.post('/:id/submit', authenticateJWT(), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const userInfo = extractUserInfo(req);
    
    // Check ownership
    const jobCheck = await client.query(
      'SELECT created_by, status, department_id FROM job_preparations WHERE id = $1',
      [id]
    );
    
    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Job preparation not found' });
    }
    
    const job = jobCheck.rows[0];
    
    if (job.created_by !== userInfo.userId && userInfo.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    if (job.status !== 'draft') {
      return res.status(400).json({ 
        error: 'Job must be in draft status to submit'
      });
    }
    
    // Check if there are items
    const itemsCheck = await client.query(
      'SELECT COUNT(*) FROM job_preparation_items WHERE job_preparation_id = $1',
      [id]
    );
    
    if (parseInt(itemsCheck.rows[0].count) === 0) {
      return res.status(400).json({ 
        error: 'Cannot submit job preparation without items'
      });
    }
    
    // Update status
    await client.query(`
      UPDATE job_preparations SET
        status = 'pending_approval',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id]);
    
    // Log activity
    await client.query(`
      INSERT INTO job_preparation_history (
        job_preparation_id,
        changed_by,
        change_type,
        old_status,
        new_status,
        notes
      ) VALUES ($1, $2, 'submitted', 'draft', 'pending_approval', 'Submitted for manager approval')
    `, [id, userInfo.userId]);
    
    await client.query('COMMIT');
    
    res.json({ 
      message: 'Job preparation submitted for approval',
      status: 'pending_approval'
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Submit job preparation error:', err);
    res.status(500).json({ 
      error: 'Failed to submit job preparation',
      details: err.message 
    });
  } finally {
    client.release();
  }
});

// =======================================================
// 8. MANAGER APPROVE/REJECT
// =======================================================

router.post('/:id/review', 
  authenticateJWT(), 
  checkRole(['manager', 'admin']), 
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { id } = req.params;
      const userInfo = extractUserInfo(req);
      const { action, review_notes } = req.body;
      
      if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ 
          error: 'Action must be "approve" or "reject"'
        });
      }
      
      // Get job
      const jobResult = await client.query(
        'SELECT * FROM job_preparations WHERE id = $1',
        [id]
      );
      
      if (jobResult.rows.length === 0) {
        return res.status(404).json({ error: 'Job preparation not found' });
      }
      
      const job = jobResult.rows[0];
      
      // Check if manager is from same department
      const managerDept = await client.query(
        'SELECT department_id FROM users WHERE id = $1',
        [userInfo.userId]
      );
      
      if (managerDept.rows[0]?.department_id !== job.department_id && userInfo.role !== 'admin') {
        return res.status(403).json({ 
          error: 'Can only review jobs from your department'
        });
      }
      
      if (job.status !== 'pending_approval') {
        return res.status(400).json({ 
          error: 'Job is not pending approval'
        });
      }
      
      const newStatus = action === 'approve' ? 'approved' : 'draft';
      
      // Update job
      await client.query(`
        UPDATE job_preparations SET
          status = $1,
          reviewed_by = $2,
          reviewed_at = CURRENT_TIMESTAMP,
          review_notes = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
      `, [newStatus, userInfo.userId, review_notes, id]);
      
      // Log activity
      await client.query(`
        INSERT INTO job_preparation_history (
          job_preparation_id,
          changed_by,
          change_type,
          old_status,
          new_status,
          notes
        ) VALUES ($1, $2, $3, 'pending_approval', $4, $5)
      `, [
        id, 
        userInfo.userId, 
        action, 
        newStatus, 
        review_notes || `Job ${action}d by manager`
      ]);
      
      await client.query('COMMIT');
      
      res.json({ 
        message: `Job preparation ${action}d successfully`,
        status: newStatus
      });
      
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ Review job preparation error:', err);
      res.status(500).json({ 
        error: 'Failed to review job preparation',
        details: err.message 
      });
    } finally {
      client.release();
    }
});


module.exports = router;