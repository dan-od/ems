const express = require('express');
const { authenticateJWT, checkRole } = require('../middleware/auth');
const pool = require('../config/db');
const router = express.Router();
const { logActivity, ACTION_TYPES, ENTITY_TYPES, extractUserInfo } = require('../utils/activityLogger');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// ============================================================================
// IMAGE UPLOAD CONFIGURATION
// ============================================================================

// Ensure upload directories exist
const ensureUploadDirs = async () => {
  const dirs = [
    'uploads/equipment',
    'uploads/maintenance'
  ];
  
  for (const dir of dirs) {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    }
  }
};

ensureUploadDirs();

// Multer configuration for equipment images
const equipmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/equipment/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `equipment-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const equipmentUpload = multer({
  storage: equipmentStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
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

// Multer configuration for maintenance images
const maintenanceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/maintenance/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `maintenance-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const maintenanceUpload = multer({
  storage: maintenanceStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

// Status validation middleware
const validateEquipmentStatus = (req, res, next) => {
  const validStatuses = ['Operational', 'Maintenance', 'Retired'];
  if (req.body.status && !validStatuses.includes(req.body.status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }
  next();
};

// ============================================================================
// IMPORTANT: Specific routes MUST come BEFORE parameterized routes like /:id
// ============================================================================

// @desc    Get equipment stats
router.get('/stats', authenticateJWT(), async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(CASE WHEN status = 'Operational' THEN 1 END) as available,
        COUNT(CASE WHEN status = 'Maintenance' THEN 1 END) as maintenance,
        COUNT(CASE WHEN status = 'Retired' THEN 1 END) as retired,
        COALESCE((SELECT COUNT(*) FROM requests WHERE status = 'Pending'), 0) as pending
      FROM equipment
    `);
    
    if (!stats.rows[0]) {
      return res.json({
        available: 0,
        maintenance: 0,
        retired: 0,
        pending: 0
      });
    }
    
    res.json(stats.rows[0]);
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Failed to fetch stats', details: err.message });
  }
});

// ============================================================================
// ENGINEER-SPECIFIC ENDPOINTS - MUST BE BEFORE /:id ROUTE
// ============================================================================

/**
 * @route   GET /api/equipment/my-assigned
 * @desc    Get equipment currently assigned to the logged-in engineer
 * @access  Engineer, Admin
 */
router.get('/my-assigned', authenticateJWT(), async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log(`📦 Fetching assigned equipment for user #${userId}`);

    const { rows } = await pool.query(`
      SELECT 
        e.id,
        e.name,
        e.description,
        e.status,
        e.location as base_location,
        e.image_path,
        e.image_urls,
        ea.id as assignment_id,
        ea.assigned_at,
        ea.location as current_location,
        ea.notes,
        m.maintenance_type as last_maintenance_type,
        m.date as last_maintenance_date,
        -- Calculate days since last maintenance
        EXTRACT(DAY FROM (NOW() - m.date)) as days_since_maintenance,
        -- Calculate if service is due (example: 30 days)
        CASE 
          WHEN m.date IS NULL THEN false
          WHEN EXTRACT(DAY FROM (NOW() - m.date)) > 30 THEN true
          ELSE false
        END as service_due
      FROM equipment_assignments ea
      INNER JOIN equipment e ON ea.equipment_id = e.id
      LEFT JOIN LATERAL (
        SELECT maintenance_type, date
        FROM maintenance_logs
        WHERE equipment_id = e.id
        ORDER BY date DESC
        LIMIT 1
      ) m ON true
      WHERE ea.assigned_to = $1 
        AND ea.returned_at IS NULL
        AND e.status != 'Retired'
      ORDER BY ea.assigned_at DESC
    `, [userId]);

    console.log(`✅ Found ${rows.length} assigned equipment`);
    res.json(rows);
  } catch (err) {
    console.error('❌ Get my assigned equipment error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch assigned equipment',
      details: err.message 
    });
  }
});

/**
 * @route   GET /api/equipment/assignment-history
 * @desc    Get assignment history for logged-in engineer
 * @access  Engineer, Admin
 */
router.get('/assignment-history', authenticateJWT(), async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;

    const { rows } = await pool.query(`
      SELECT 
        ea.*,
        e.name as equipment_name,
        e.description as equipment_description,
        e.image_path,
        u.name as assigned_by_name
      FROM equipment_assignments ea
      INNER JOIN equipment e ON ea.equipment_id = e.id
      LEFT JOIN users u ON ea.assigned_by = u.id
      WHERE ea.assigned_to = $1
      ORDER BY ea.assigned_at DESC
      LIMIT $2
    `, [userId, limit]);

    res.json(rows);
  } catch (err) {
    console.error('❌ Get assignment history error:', err);
    res.status(500).json({ error: 'Failed to fetch assignment history' });
  }
});

// ============================================================================
// NOW the parameterized routes can come (they won't catch specific routes above)
// ============================================================================

// @desc    Get all equipment (with images)
router.get('/', authenticateJWT(), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        e.*,
        u.name as added_by_name
      FROM equipment e
      LEFT JOIN users u ON e.added_by = u.id
      ORDER BY e.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET equipment error:', err);
    res.status(500).json({ error: 'Failed to fetch equipment' });
  }
});

// @desc    Get equipment by ID (with images)
router.get('/:id', authenticateJWT(), async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(`
      SELECT 
        e.*,
        u.name as added_by_name
      FROM equipment e
      LEFT JOIN users u ON e.added_by = u.id
      WHERE e.id = $1
    `, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('GET equipment by ID error:', err);
    res.status(500).json({ error: 'Failed to fetch equipment' });
  }
});

// @desc    Get maintenance logs for equipment (with images)
router.get('/:id/maintenance', authenticateJWT(), async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(`
      SELECT m.*
      FROM maintenance_logs m
      WHERE m.equipment_id = $1
      ORDER BY m.date DESC
    `, [id]);
    
    res.json(rows);
  } catch (err) {
    console.error('GET maintenance logs error:', err);
    res.status(500).json({ error: 'Failed to fetch maintenance logs' });
  }
});

// ============================================================================
// UPDATED: Add maintenance log WITH IMAGE SUPPORT
// ============================================================================
router.post('/:id/maintenance', 
  authenticateJWT(),
  maintenanceUpload.fields([
    { name: 'before_images', maxCount: 3 },
    { name: 'after_images', maxCount: 3 }
  ]),
  async (req, res) => {
    const { id } = req.params;
    const { maintenance_type, description, date, hours_at_service, performed_by } = req.body;
    const userInfo = extractUserInfo(req);
    
    try {
      console.log('Adding maintenance log with images:', { id, maintenance_type, description, date });
      
      // Get uploaded images
      const beforeImages = req.files?.before_images 
        ? req.files.before_images.map(f => `/uploads/maintenance/${f.filename}`)
        : [];
      const afterImages = req.files?.after_images 
        ? req.files.after_images.map(f => `/uploads/maintenance/${f.filename}`)
        : [];
      const allImages = [...beforeImages, ...afterImages];
      
      // Check if columns exist before inserting
      const columnCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'maintenance_logs' 
        AND column_name IN ('before_images', 'after_images', 'image_urls', 'hours_at_service', 'created_by', 'performed_by')
      `);
      
      const existingColumns = columnCheck.rows.map(r => r.column_name);
      const hasImageColumns = existingColumns.includes('image_urls');
      const hasBeforeAfter = existingColumns.includes('before_images') && existingColumns.includes('after_images');
      const hasHoursAtService = existingColumns.includes('hours_at_service');
      const hasCreatedBy = existingColumns.includes('created_by');
      const hasPerformedBy = existingColumns.includes('performed_by');
      
      // Build query dynamically based on available columns
      let query = `INSERT INTO maintenance_logs (equipment_id, maintenance_type, description, date`;
      let values = [id, maintenance_type, description, date || new Date()];
      let paramCount = 4;
      
      if (hasHoursAtService && hours_at_service) {
        query += `, hours_at_service`;
        values.push(hours_at_service);
        paramCount++;
      }
      
      if (hasCreatedBy) {
        query += `, created_by`;
        values.push(req.user.id);
        paramCount++;
      }
      
      if (hasPerformedBy) {
        query += `, performed_by`;
        values.push(performed_by || userInfo.userName);
        paramCount++;
      }
      
      if (hasBeforeAfter) {
        query += `, before_images, after_images`;
        values.push(JSON.stringify(beforeImages), JSON.stringify(afterImages));
        paramCount += 2;
      }
      
      if (hasImageColumns) {
        query += `, image_urls`;
        values.push(JSON.stringify(allImages));
        paramCount++;
      }
      
      query += `) RETURNING *`;
      
      const { rows } = await pool.query(query, values);
      
      // Update equipment last service hours if provided
      if (hasHoursAtService && hours_at_service) {
        await pool.query(`
          UPDATE equipment SET
            last_service_hours = $1,
            last_maintained = $2,
            updated_at = NOW()
          WHERE id = $3
        `, [hours_at_service, date || new Date(), id]);
      }
      
      // Log activity
      await logActivity({
        ...userInfo,
        actionType: ACTION_TYPES.MAINTENANCE_LOGGED,
        entityType: ENTITY_TYPES.EQUIPMENT,
        entityId: id,
        entityName: `Equipment #${id}`,
        description: `Maintenance: ${maintenance_type} with ${allImages.length} image(s)`,
        metadata: {
          maintenance_type,
          images_count: allImages.length
        }
      });
      
      console.log(`✅ Maintenance log created with ${allImages.length} images`);
      res.status(201).json(rows[0]);
    } catch (err) {
      console.error('Error adding maintenance log:', err);
      res.status(500).json({ 
        error: 'Failed to add maintenance log', 
        details: err.message 
      });
    }
});

/**
 * @route   POST /api/equipment/:id/report-issue
 * @desc    Quick report equipment issue (creates maintenance request)
 * @access  Engineer
 */
router.post('/:id/report-issue', 
  authenticateJWT(), 
  checkRole(['engineer', 'admin']), 
  async (req, res) => {
    const equipmentId = req.params.id;
    const { issue_description, urgency = 'Medium' } = req.body;
    const userId = req.user.id;

    if (!issue_description || !issue_description.trim()) {
      return res.status(400).json({ error: 'Issue description is required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get user's department
      const userDept = await client.query(
        'SELECT department_id FROM users WHERE id = $1',
        [userId]
      );

      if (!userDept.rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'User department not found' });
      }

      const departmentId = userDept.rows[0].department_id;

      // Create request
      const requestRes = await client.query(
        `INSERT INTO requests (
          requested_by, 
          subject, 
          description, 
          priority, 
          department_id, 
          request_type,
          status,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, 'maintenance', 'Pending', NOW(), NOW())
        RETURNING id`,
        [
          userId,
          `Equipment Issue: ${equipmentId}`,
          issue_description,
          urgency,
          departmentId
        ]
      );

      const requestId = requestRes.rows[0].id;

      // Insert into maintenance_requests if that table exists
      try {
        await client.query(
          `INSERT INTO maintenance_requests (request_id, equipment_id, issue_description, urgency)
           VALUES ($1, $2, $3, $4)`,
          [requestId, equipmentId, issue_description, urgency]
        );
      } catch (err) {
        // Table might not exist, that's okay
        console.log('ℹ️ maintenance_requests table not found, skipping...');
      }

      await client.query('COMMIT');
      
      console.log(`✅ Issue reported for equipment #${equipmentId} - Request #${requestId}`);
      
      res.status(201).json({ 
        message: 'Issue reported successfully',
        request_id: requestId 
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ Report equipment issue error:', err);
      res.status(500).json({ 
        error: 'Failed to report equipment issue',
        details: err.message 
      });
    } finally {
      client.release();
    }
});

// ============================================================================
// UPDATED: Create new equipment WITH IMAGE SUPPORT
// ============================================================================
router.post('/', 
  authenticateJWT(), 
  checkRole(['admin', 'manager']),
  equipmentUpload.array('equipment_images', 5), // Allow up to 5 images
  async (req, res) => {
    const userInfo = extractUserInfo(req);
    const { 
      name, 
      description, 
      status = 'Operational', 
      location,
      hours_run = 0,
      service_interval_hours = 250,
      last_service_hours = 0
    } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Equipment name is required' });
    }

    try {
      // Get uploaded image paths
      const imageUrls = req.files ? req.files.map(f => `/uploads/equipment/${f.filename}`) : [];
      const primaryImage = imageUrls.length > 0 ? imageUrls[0] : null;
      
      // Check if image columns exist
      const columnCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'equipment' 
        AND column_name IN ('image_path', 'image_urls', 'hours_run', 'service_interval_hours', 'last_service_hours', 'created_by')
      `);
      
      const existingColumns = columnCheck.rows.map(r => r.column_name);
      const hasImagePath = existingColumns.includes('image_path');
      const hasImageUrls = existingColumns.includes('image_urls');
      const hasHoursRun = existingColumns.includes('hours_run');
      const hasServiceInterval = existingColumns.includes('service_interval_hours');
      const hasLastServiceHours = existingColumns.includes('last_service_hours');
      const hasCreatedBy = existingColumns.includes('created_by');
      
      // Build query dynamically
      let query = `INSERT INTO equipment (name, description, status, location, added_by`;
      let values = [name, description, status, location, req.user.id];
      let paramCount = 5;
      
      if (hasCreatedBy) {
        query += `, created_by`;
        values.push(req.user.id);
        paramCount++;
      }
      
      if (hasImagePath && primaryImage) {
        query += `, image_path`;
        values.push(primaryImage);
        paramCount++;
      }
      
      if (hasImageUrls) {
        query += `, image_urls`;
        values.push(JSON.stringify(imageUrls));
        paramCount++;
      }
      
      if (hasHoursRun) {
        query += `, hours_run`;
        values.push(hours_run);
        paramCount++;
      }
      
      if (hasServiceInterval) {
        query += `, service_interval_hours`;
        values.push(service_interval_hours);
        paramCount++;
      }
      
      if (hasLastServiceHours) {
        query += `, last_service_hours`;
        values.push(last_service_hours);
        paramCount++;
      }
      
      query += `) RETURNING *`;
      
      const { rows } = await pool.query(query, values);
      const newEquipment = rows[0];
    
      // ✅ LOG EQUIPMENT CREATION
      await logActivity({
        ...userInfo,
        actionType: ACTION_TYPES.EQUIPMENT_CREATED,
        entityType: ENTITY_TYPES.EQUIPMENT,
        entityId: newEquipment.id,
        entityName: newEquipment.name,
        description: `Created equipment: ${newEquipment.name} with ${imageUrls.length} image(s)`,
        metadata: {
          status: newEquipment.status,
          location: newEquipment.location,
          images_count: imageUrls.length
        }
      });
      
      console.log(`✅ Equipment created: ${name} with ${imageUrls.length} image(s)`);
      res.status(201).json(rows[0]);
    } catch (err) {
      console.error('Create equipment error:', err);
      
      if (err.code === '23505') {
        return res.status(400).json({ error: 'Equipment with this name already exists' });
      }
      if (err.code === '23502') {
        return res.status(400).json({ error: 'Required field missing' });
      }
      
      res.status(500).json({ 
        error: 'Failed to create equipment',
        detail: err.message
      });
    }
  }
);

// ============================================================================
// NEW: Upload additional images to existing equipment
// ============================================================================
router.post('/:id/images', 
  authenticateJWT(),
  checkRole(['admin', 'manager']),
  equipmentUpload.array('equipment_images', 5),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userInfo = extractUserInfo(req);
      
      // Check if image_urls column exists
      const columnCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'equipment' 
        AND column_name = 'image_urls'
      `);
      
      if (columnCheck.rows.length === 0) {
        return res.status(400).json({ 
          error: 'Image upload not supported. Please run database migration first.' 
        });
      }
      
      // Get existing equipment
      const equipmentResult = await pool.query(
        'SELECT name, image_urls FROM equipment WHERE id = $1',
        [id]
      );
      
      if (equipmentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Equipment not found' });
      }
      
      const equipment = equipmentResult.rows[0];
      
      // Get existing images
      let existingImages = [];
      if (equipment.image_urls) {
        try {
          existingImages = JSON.parse(equipment.image_urls);
        } catch (e) {
          existingImages = [];
        }
      }
      
      // Add new images
      const newImages = req.files ? req.files.map(f => `/uploads/equipment/${f.filename}`) : [];
      const allImages = [...existingImages, ...newImages];
      
      // Update equipment
      await pool.query(`
        UPDATE equipment SET
          image_urls = $1,
          image_path = $2,
          updated_at = NOW()
        WHERE id = $3
      `, [
        JSON.stringify(allImages),
        allImages.length > 0 ? allImages[0] : null,
        id
      ]);
      
      // Log activity
      await logActivity({
        ...userInfo,
        actionType: ACTION_TYPES.EQUIPMENT_MODIFIED,
        entityType: ENTITY_TYPES.EQUIPMENT,
        entityId: id,
        entityName: equipment.name,
        description: `Added ${newImages.length} image(s) to equipment: ${equipment.name}`,
        metadata: {
          images_added: newImages.length,
          total_images: allImages.length
        }
      });
      
      console.log(`✅ Added ${newImages.length} images to equipment #${id}`);
      res.json({ 
        message: 'Images uploaded successfully',
        image_count: allImages.length,
        images: allImages
      });
      
    } catch (err) {
      console.error('❌ Upload equipment images error:', err);
      res.status(500).json({ 
        error: 'Failed to upload images',
        details: err.message 
      });
    }
});

// ============================================================================
// NEW: Delete equipment image
// ============================================================================
router.delete('/:id/images', 
  authenticateJWT(),
  checkRole(['admin', 'manager']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { image_url } = req.body;
      const userInfo = extractUserInfo(req);
      
      if (!image_url) {
        return res.status(400).json({ error: 'image_url is required' });
      }
      
      // Get equipment
      const equipmentResult = await pool.query(
        'SELECT name, image_urls FROM equipment WHERE id = $1',
        [id]
      );
      
      if (equipmentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Equipment not found' });
      }
      
      const equipment = equipmentResult.rows[0];
      
      // Get current images
      let images = [];
      if (equipment.image_urls) {
        try {
          images = JSON.parse(equipment.image_urls);
        } catch (e) {
          images = [];
        }
      }
      
      // Remove the specified image
      images = images.filter(img => img !== image_url);
      
      // Update equipment
      await pool.query(`
        UPDATE equipment SET
          image_urls = $1,
          image_path = $2,
          updated_at = NOW()
        WHERE id = $3
      `, [
        JSON.stringify(images),
        images.length > 0 ? images[0] : null,
        id
      ]);
      
      // Try to delete the physical file
      try {
        const filePath = path.join(__dirname, '..', image_url);
        await fs.unlink(filePath);
        console.log(`✅ Deleted file: ${filePath}`);
      } catch (fileErr) {
        console.log('⚠️ Could not delete physical file:', fileErr.message);
      }
      
      // Log activity
      await logActivity({
        ...userInfo,
        actionType: ACTION_TYPES.EQUIPMENT_MODIFIED,
        entityType: ENTITY_TYPES.EQUIPMENT,
        entityId: id,
        entityName: equipment.name,
        description: `Deleted image from equipment: ${equipment.name}`,
        metadata: {
          deleted_image: image_url,
          remaining_images: images.length
        }
      });
      
      res.json({ 
        message: 'Image deleted successfully',
        remaining_images: images.length
      });
      
    } catch (err) {
      console.error('❌ Delete equipment image error:', err);
      res.status(500).json({ 
        error: 'Failed to delete image',
        details: err.message 
      });
    }
});

// @desc    Update equipment
router.put('/:id', 
  authenticateJWT(), 
  checkRole(['admin', 'manager']), 
  async (req, res) => {
    const { id } = req.params;
    const userInfo = extractUserInfo(req);
    const { name, description, status, location, last_maintained } = req.body;
    
    try {
      // Get old equipment data for logging
      const oldEquip = await pool.query('SELECT * FROM equipment WHERE id = $1', [id]);
      if (oldEquip.rows.length === 0) {
        return res.status(404).json({ error: 'Equipment not found' });
      }

      const { rows } = await pool.query(
        `UPDATE equipment 
         SET name = COALESCE($1, name),
             description = COALESCE($2, description),
             status = COALESCE($3, status),
             location = COALESCE($4, location),
             last_maintained = COALESCE($5, last_maintained),
             updated_at = NOW()
         WHERE id = $6
         RETURNING *`,
        [name, description, status, location, last_maintained, id]
      );

      const updatedEquipment = rows[0];
    
      // Build changes object
      const changes = {};
      if (name && name !== oldEquip.rows[0].name) changes.name = { old: oldEquip.rows[0].name, new: name };
      if (status && status !== oldEquip.rows[0].status) changes.status = { old: oldEquip.rows[0].status, new: status };
      if (location && location !== oldEquip.rows[0].location) changes.location = { old: oldEquip.rows[0].location, new: location };
      
      // ✅ LOG EQUIPMENT MODIFICATION
      await logActivity({
        ...userInfo,
        actionType: ACTION_TYPES.EQUIPMENT_MODIFIED,
        entityType: ENTITY_TYPES.EQUIPMENT,
        entityId: updatedEquipment.id,
        entityName: updatedEquipment.name,
        description: `Modified equipment: ${updatedEquipment.name}`,
        metadata: { changes }
      });
      
      res.json(rows[0]);
    } catch (err) {
      console.error('Update equipment error:', err);
      
      if (err.code === '23505') {
        return res.status(400).json({ error: 'Equipment with this name already exists' });
      }
      
      res.status(500).json({ 
        error: 'Failed to update equipment',
        detail: err.message
      });
    }
  }
);

// @desc    Delete equipment
router.delete('/:id',
  authenticateJWT(),
  checkRole(['admin']),
  async (req, res) => {
    const { id } = req.params;
    const userInfo = extractUserInfo(req);

    try {
      const exists = await pool.query('SELECT name, image_urls FROM equipment WHERE id = $1', [id]);
      if (exists.rows.length === 0) {
        return res.status(404).json({ error: 'Equipment not found' });
      }

      const equipment = exists.rows[0];
      
      // Delete associated images
      if (equipment.image_urls) {
        try {
          const images = JSON.parse(equipment.image_urls);
          for (const imageUrl of images) {
            try {
              const filePath = path.join(__dirname, '..', imageUrl);
              await fs.unlink(filePath);
              console.log(`✅ Deleted file: ${filePath}`);
            } catch (fileErr) {
              console.log(`⚠️ Could not delete file ${imageUrl}:`, fileErr.message);
            }
          }
        } catch (e) {
          console.log('⚠️ Error parsing image URLs:', e.message);
        }
      }

      await pool.query('DELETE FROM equipment WHERE id = $1', [id]);
      
      // Log activity
      await logActivity({
        ...userInfo,
        actionType: ACTION_TYPES.EQUIPMENT_DELETED,
        entityType: ENTITY_TYPES.EQUIPMENT,
        entityId: id,
        entityName: equipment.name,
        description: `Deleted equipment: ${equipment.name}`,
        metadata: {}
      });
      
      res.json({ message: 'Equipment deleted successfully' });
    } catch (err) {
      console.error('DELETE equipment error:', err);
      res.status(500).json({ error: 'Failed to delete equipment' });
    }
  }
);

module.exports = router;