// ems-backend/routes/jobInspections.js
// =======================================================
// PRE-JOB & POST-JOB INSPECTION ROUTES
// Handles equipment inspections before and after field jobs
// =======================================================

const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateJWT, checkRole } = require('../middleware/auth');
const { extractUserInfo } = require('../utils/activityLogger');
const multer = require('multer');
const path = require('path');

// Multer configuration for inspection images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.path.includes('prejob') ? 'prejob-inspections' : 'postjob-inspections';
    cb(null, `uploads/${type}/`);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files allowed'));
  }
});

// =======================================================
// PRE-JOB INSPECTIONS
// =======================================================

// @desc    Get all pre-job inspections for a job
// @route   GET /job-inspections/prejob/:jobId
// @access  Authenticated
router.get('/prejob/:jobId', authenticateJWT(), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { jobId } = req.params;
    
    const result = await client.query(`
      SELECT 
        pri.*,
        jpi.custom_item_name,
        e.name as equipment_name,
        u.name as inspector_name,
        a.name as approved_by_name
      FROM prejob_inspections pri
      INNER JOIN job_preparation_items jpi ON pri.job_preparation_item_id = jpi.id
      LEFT JOIN equipment e ON jpi.equipment_id = e.id
      LEFT JOIN users u ON pri.inspector_id = u.id
      LEFT JOIN users a ON pri.approved_by = a.id
      WHERE jpi.job_preparation_id = $1
      ORDER BY pri.inspection_date DESC
    `, [jobId]);
    
    res.json(result.rows);
    
  } catch (err) {
    console.error('❌ Get pre-job inspections error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch inspections',
      details: err.message 
    });
  } finally {
    client.release();
  }
});

// @desc    Create pre-job inspection
// @route   POST /job-inspections/prejob
// @access  Engineer/Staff/Manager
router.post('/prejob', 
  authenticateJWT(), 
  upload.array('inspection_images', 5), 
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const userInfo = extractUserInfo(req);
      const { 
        job_preparation_item_id,
        checklist_data,
        overall_status,
        inspector_notes
      } = req.body;
      
      // Validate
      if (!job_preparation_item_id) {
        return res.status(400).json({ 
          error: 'Job preparation item ID is required' 
        });
      }
      
      // Parse checklist data if it's a string
      let checklistObj = checklist_data;
      if (typeof checklist_data === 'string') {
        try {
          checklistObj = JSON.parse(checklist_data);
        } catch (e) {
          return res.status(400).json({ error: 'Invalid checklist data format' });
        }
      }
      
      // Get uploaded file paths
      const imageUrls = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];
      
      // Create inspection
      const result = await client.query(`
        INSERT INTO prejob_inspections (
          job_preparation_item_id,
          inspector_id,
          checklist_data,
          overall_status,
          inspector_notes,
          image_urls
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        job_preparation_item_id,
        userInfo.userId,
        JSON.stringify(checklistObj),
        overall_status || 'pending',
        inspector_notes,
        JSON.stringify(imageUrls)
      ]);
      
      // Update item status based on inspection result
      let itemStatus = 'pending';
      if (overall_status === 'passed') {
        itemStatus = 'available';
      } else if (overall_status === 'failed') {
        itemStatus = 'unavailable';
      } else if (overall_status === 'needs_attention') {
        itemStatus = 'needs_maintenance';
      }
      
      await client.query(`
        UPDATE job_preparation_items 
        SET item_status = $1
        WHERE id = $2
      `, [itemStatus, job_preparation_item_id]);
      
      await client.query('COMMIT');
      
      res.status(201).json(result.rows[0]);
      
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ Create pre-job inspection error:', err);
      res.status(500).json({ 
        error: 'Failed to create inspection',
        details: err.message 
      });
    } finally {
      client.release();
    }
});

// @desc    Update pre-job inspection
// @route   PUT /job-inspections/prejob/:id
// @access  Inspector or Manager
router.put('/prejob/:id', 
  authenticateJWT(), 
  upload.array('inspection_images', 5),
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { id } = req.params;
      const userInfo = extractUserInfo(req);
      const {
        checklist_data,
        overall_status,
        inspector_notes
      } = req.body;
      
      // Check authorization
      const inspectionCheck = await client.query(
        'SELECT inspector_id FROM prejob_inspections WHERE id = $1',
        [id]
      );
      
      if (inspectionCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Inspection not found' });
      }
      
      const inspection = inspectionCheck.rows[0];
      
      if (inspection.inspector_id !== userInfo.userId && 
          userInfo.role !== 'manager' && 
          userInfo.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized to update this inspection' });
      }
      
      // Parse checklist data
      let checklistObj = checklist_data;
      if (typeof checklist_data === 'string') {
        try {
          checklistObj = JSON.parse(checklist_data);
        } catch (e) {
          return res.status(400).json({ error: 'Invalid checklist data' });
        }
      }
      
      // Get existing images
      const existing = await client.query(
        'SELECT image_urls FROM prejob_inspections WHERE id = $1',
        [id]
      );
      
      let imageUrls = [];
      if (existing.rows[0]?.image_urls) {
        imageUrls = JSON.parse(existing.rows[0].image_urls);
      }
      
      // Add new images
      if (req.files) {
        const newImages = req.files.map(f => `/uploads/${f.filename}`);
        imageUrls = [...imageUrls, ...newImages];
      }
      
      // Update inspection
      const result = await client.query(`
        UPDATE prejob_inspections SET
          checklist_data = COALESCE($1, checklist_data),
          overall_status = COALESCE($2, overall_status),
          inspector_notes = COALESCE($3, inspector_notes),
          image_urls = $4,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING *
      `, [
        checklistObj ? JSON.stringify(checklistObj) : null,
        overall_status,
        inspector_notes,
        JSON.stringify(imageUrls),
        id
      ]);
      
      await client.query('COMMIT');
      
      res.json(result.rows[0]);
      
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ Update pre-job inspection error:', err);
      res.status(500).json({ 
        error: 'Failed to update inspection',
        details: err.message 
      });
    } finally {
      client.release();
    }
});

// @desc    Manager approve pre-job inspection
// @route   POST /job-inspections/prejob/:id/approve
// @access  Manager
router.post('/prejob/:id/approve', 
  authenticateJWT(),
  checkRole(['manager', 'admin']),
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { id } = req.params;
      const userInfo = extractUserInfo(req);
      const { approval_notes } = req.body;
      
      // Update inspection
      await client.query(`
        UPDATE prejob_inspections SET
          approved_by = $1,
          approved_at = CURRENT_TIMESTAMP,
          approval_notes = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [userInfo.userId, approval_notes, id]);
      
      await client.query('COMMIT');
      
      res.json({ message: 'Inspection approved successfully' });
      
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ Approve pre-job inspection error:', err);
      res.status(500).json({ 
        error: 'Failed to approve inspection',
        details: err.message 
      });
    } finally {
      client.release();
    }
});

// =======================================================
// POST-JOB INSPECTIONS
// =======================================================

// @desc    Get all post-job inspections for a job
// @route   GET /job-inspections/postjob/:jobId
// @access  Authenticated
router.get('/postjob/:jobId', authenticateJWT(), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { jobId } = req.params;
    
    const result = await client.query(`
      SELECT 
        poi.*,
        jpi.custom_item_name,
        e.name as equipment_name,
        u.name as inspector_name,
        a.name as approved_by_name
      FROM postjob_inspections poi
      INNER JOIN job_preparation_items jpi ON poi.job_preparation_item_id = jpi.id
      LEFT JOIN equipment e ON jpi.equipment_id = e.id
      LEFT JOIN users u ON poi.inspector_id = u.id
      LEFT JOIN users a ON poi.approved_by = a.id
      WHERE jpi.job_preparation_id = $1
      ORDER BY poi.return_date DESC
    `, [jobId]);
    
    res.json(result.rows);
    
  } catch (err) {
    console.error('❌ Get post-job inspections error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch inspections',
      details: err.message 
    });
  } finally {
    client.release();
  }
});

// @desc    Create post-job inspection
// @route   POST /job-inspections/postjob
// @access  Engineer/Staff/Manager
router.post('/postjob', 
  authenticateJWT(),
  upload.fields([
    { name: 'general_images', maxCount: 5 },
    { name: 'damage_images', maxCount: 5 }
  ]),
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const userInfo = extractUserInfo(req);
      const {
        job_preparation_item_id,
        equipment_returned,
        equipment_condition,
        needs_maintenance,
        maintenance_priority,
        maintenance_description,
        equipment_failed,
        failure_description,
        failure_date,
        downtime_hours,
        hours_used,
        cycles_completed,
        checklist_data,
        inspector_notes
      } = req.body;
      
      // Validate
      if (!job_preparation_item_id) {
        return res.status(400).json({ 
          error: 'Job preparation item ID is required' 
        });
      }
      
      // Parse checklist data
      let checklistObj = checklist_data;
      if (typeof checklist_data === 'string') {
        try {
          checklistObj = JSON.parse(checklist_data);
        } catch (e) {
          return res.status(400).json({ error: 'Invalid checklist data format' });
        }
      }
      
      // Get uploaded images
      const generalImages = req.files?.general_images 
        ? req.files.general_images.map(f => `/uploads/${f.filename}`) 
        : [];
      const damageImages = req.files?.damage_images 
        ? req.files.damage_images.map(f => `/uploads/${f.filename}`) 
        : [];
      
      // Create post-job inspection
      const result = await client.query(`
        INSERT INTO postjob_inspections (
          job_preparation_item_id,
          inspector_id,
          equipment_returned,
          equipment_condition,
          needs_maintenance,
          maintenance_priority,
          maintenance_description,
          equipment_failed,
          failure_description,
          failure_date,
          downtime_hours,
          hours_used,
          cycles_completed,
          checklist_data,
          inspector_notes,
          image_urls,
          damage_images
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *
      `, [
        job_preparation_item_id,
        userInfo.userId,
        equipment_returned !== false, // Default true
        equipment_condition || 'good',
        needs_maintenance === true || needs_maintenance === 'true',
        maintenance_priority || null,
        maintenance_description || null,
        equipment_failed === true || equipment_failed === 'true',
        failure_description || null,
        failure_date || null,
        downtime_hours || null,
        hours_used || null,
        cycles_completed || null,
        JSON.stringify(checklistObj || {}),
        inspector_notes || null,
        JSON.stringify(generalImages),
        JSON.stringify(damageImages)
      ]);
      
      // Update item status
      let itemStatus = 'returned';
      if (!equipment_returned) {
        itemStatus = 'unavailable'; // Lost/not returned
      } else if (needs_maintenance === true || needs_maintenance === 'true') {
        itemStatus = 'needs_maintenance';
      }
      
      await client.query(`
        UPDATE job_preparation_items 
        SET item_status = $1
        WHERE id = $2
      `, [itemStatus, job_preparation_item_id]);
      
      // If maintenance needed, create maintenance request
      if ((needs_maintenance === true || needs_maintenance === 'true') && maintenance_description) {
        const itemInfo = await client.query(
          'SELECT equipment_id FROM job_preparation_items WHERE id = $1',
          [job_preparation_item_id]
        );
        
        const equipmentId = itemInfo.rows[0]?.equipment_id;
        
        if (equipmentId) {
          // Get user's department
          const deptResult = await client.query(
            'SELECT department_id FROM users WHERE id = $1',
            [userInfo.userId]
          );
          const departmentId = deptResult.rows[0]?.department_id;
          
          // Create maintenance request
          const requestResult = await client.query(`
            INSERT INTO requests (
              requested_by,
              subject,
              description,
              priority,
              department_id,
              request_type,
              status,
              created_at,
              updated_at
            ) VALUES ($1, $2, $3, $4, $5, 'maintenance', 'Pending', NOW(), NOW())
            RETURNING id
          `, [
            userInfo.userId,
            `Post-Job Maintenance: Equipment #${equipmentId}`,
            maintenance_description,
            maintenance_priority || 'medium',
            departmentId
          ]);
          
          // Link to maintenance_requests table
          await client.query(`
            INSERT INTO maintenance_requests (
              request_id,
              equipment_id,
              issue_description,
              urgency
            ) VALUES ($1, $2, $3, $4)
          `, [
            requestResult.rows[0].id,
            equipmentId,
            maintenance_description,
            maintenance_priority || 'Medium'
          ]);
        }
      }
      
      // If equipment failed, log it
      if (equipment_failed === true || equipment_failed === 'true') {
        const itemInfo = await client.query(
          'SELECT equipment_id FROM job_preparation_items WHERE id = $1',
          [job_preparation_item_id]
        );
        
        const equipmentId = itemInfo.rows[0]?.equipment_id;
        
        if (equipmentId) {
          await client.query(`
            INSERT INTO maintenance_logs (
              equipment_id,
              maintenance_type,
              description,
              date,
              created_by,
              performed_by
            ) VALUES ($1, 'Failure', $2, $3, $4, $5)
          `, [
            equipmentId,
            failure_description || 'Equipment failure during job',
            failure_date || new Date(),
            userInfo.userId,
            userInfo.userName
          ]);
        }
      }
      
      await client.query('COMMIT');
      
      res.status(201).json(result.rows[0]);
      
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ Create post-job inspection error:', err);
      res.status(500).json({ 
        error: 'Failed to create post-job inspection',
        details: err.message 
      });
    } finally {
      client.release();
    }
});

// @desc    Update post-job inspection
// @route   PUT /job-inspections/postjob/:id
// @access  Inspector or Manager
router.put('/postjob/:id', 
  authenticateJWT(),
  upload.fields([
    { name: 'general_images', maxCount: 5 },
    { name: 'damage_images', maxCount: 5 }
  ]),
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { id } = req.params;
      const userInfo = extractUserInfo(req);
      const {
        equipment_condition,
        needs_maintenance,
        maintenance_description,
        inspector_notes
      } = req.body;
      
      // Check authorization
      const inspectionCheck = await client.query(
        'SELECT inspector_id, image_urls, damage_images FROM postjob_inspections WHERE id = $1',
        [id]
      );
      
      if (inspectionCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Inspection not found' });
      }
      
      const inspection = inspectionCheck.rows[0];
      
      if (inspection.inspector_id !== userInfo.userId && 
          userInfo.role !== 'manager' && 
          userInfo.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized' });
      }
      
      // Handle image updates
      let generalImages = inspection.image_urls ? JSON.parse(inspection.image_urls) : [];
      let damageImages = inspection.damage_images ? JSON.parse(inspection.damage_images) : [];
      
      if (req.files?.general_images) {
        const newImages = req.files.general_images.map(f => `/uploads/${f.filename}`);
        generalImages = [...generalImages, ...newImages];
      }
      
      if (req.files?.damage_images) {
        const newImages = req.files.damage_images.map(f => `/uploads/${f.filename}`);
        damageImages = [...damageImages, ...newImages];
      }
      
      // Update inspection
      const result = await client.query(`
        UPDATE postjob_inspections SET
          equipment_condition = COALESCE($1, equipment_condition),
          needs_maintenance = COALESCE($2, needs_maintenance),
          maintenance_description = COALESCE($3, maintenance_description),
          inspector_notes = COALESCE($4, inspector_notes),
          image_urls = $5,
          damage_images = $6,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
        RETURNING *
      `, [
        equipment_condition,
        needs_maintenance,
        maintenance_description,
        inspector_notes,
        JSON.stringify(generalImages),
        JSON.stringify(damageImages),
        id
      ]);
      
      await client.query('COMMIT');
      
      res.json(result.rows[0]);
      
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ Update post-job inspection error:', err);
      res.status(500).json({ 
        error: 'Failed to update inspection',
        details: err.message 
      });
    } finally {
      client.release();
    }
});

// @desc    Manager approve post-job inspection
// @route   POST /job-inspections/postjob/:id/approve
// @access  Manager
router.post('/postjob/:id/approve',
  authenticateJWT(),
  checkRole(['manager', 'admin']),
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { id } = req.params;
      const userInfo = extractUserInfo(req);
      const { approval_notes } = req.body;
      
      await client.query(`
        UPDATE postjob_inspections SET
          approved_by = $1,
          approved_at = CURRENT_TIMESTAMP,
          approval_notes = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [userInfo.userId, approval_notes, id]);
      
      await client.query('COMMIT');
      
      res.json({ message: 'Post-job inspection approved successfully' });
      
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ Approve post-job inspection error:', err);
      res.status(500).json({ 
        error: 'Failed to approve inspection',
        details: err.message 
      });
    } finally {
      client.release();
    }
});

module.exports = router;