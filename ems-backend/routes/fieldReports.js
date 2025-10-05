const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateJWT, checkRole } = require('../middleware/auth');
const pool = require('../config/db');
const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads/field-reports');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-userid-originalname
    const uniqueName = `${Date.now()}-${req.user.id}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

// File filter - only accept PDF, Word, Excel
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'image/jpeg',
    'image/png'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, Word, Excel, and images are allowed.'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size
  }
});

/**
 * @route   POST /api/field-reports/upload
 * @desc    Submit field report with file upload
 * @access  Engineer, Admin
 */
router.post('/upload', 
  authenticateJWT(), 
  checkRole(['engineer', 'admin']), 
  upload.single('report_file'), // 'report_file' is the form field name
  async (req, res) => {
    const {
      job_title,
      job_location,
      job_type,
      client_name,
      notes
    } = req.body;

    const userId = req.user.id;
    const file = req.file;

    // Validation
    if (!job_title || !file) {
      // Delete uploaded file if validation fails
      if (file) {
        fs.unlinkSync(file.path);
      }
      return res.status(400).json({ 
        error: 'Job title and report file are required' 
      });
    }

    try {
      // Get user's department
      const userDept = await pool.query(
        'SELECT department_id FROM users WHERE id = $1',
        [userId]
      );

      const departmentId = userDept.rows[0]?.department_id;

      const { rows } = await pool.query(
        `INSERT INTO field_reports (
          submitted_by,
          department_id,
          report_date,
          job_location,
          job_type,
          client_name,
          job_title,
          job_description,
          attachment_path,
          attachment_filename,
          attachment_type,
          status,
          created_at,
          updated_at
        ) VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6, $7, $8, $9, $10, 'Submitted', NOW(), NOW())
        RETURNING *`,
        [
          userId,
          departmentId,
          job_location || '',
          job_type || 'General',
          client_name || '',
          job_title,
          notes || '',
          file.path,
          file.originalname,
          file.mimetype
        ]
      );

      console.log(`✅ Field report #${rows[0].id} uploaded by user #${userId}`);
      res.status(201).json({ 
        message: 'Field report uploaded successfully',
        report: rows[0] 
      });
    } catch (err) {
      // Delete uploaded file if database insert fails
      if (file) {
        fs.unlinkSync(file.path);
      }
      
      console.error('❌ Upload field report error:', err);
      res.status(500).json({ 
        error: 'Failed to upload field report',
        details: err.message 
      });
    }
});

/**
 * @route   GET /api/field-reports/download/:id
 * @desc    Download field report file
 * @access  Engineer (own), Manager (dept), Admin (all)
 */
router.get('/download/:id', authenticateJWT(), async (req, res) => {
  try {
    const reportId = req.params.id;

    const { rows } = await pool.query(
      `SELECT * FROM field_reports WHERE id = $1`,
      [reportId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const report = rows[0];

    // Authorization check
    if (req.user.role === 'engineer' && report.submitted_by !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to download this report' });
    }

    if (req.user.role === 'manager' && report.department_id !== req.user.department_id) {
      return res.status(403).json({ error: 'Not authorized to download this report' });
    }

    // Check if file exists
    if (!report.attachment_path || !fs.existsSync(report.attachment_path)) {
      return res.status(404).json({ error: 'Report file not found' });
    }

    // Send file
    res.download(report.attachment_path, report.attachment_filename);
  } catch (err) {
    console.error('❌ Download report error:', err);
    res.status(500).json({ error: 'Failed to download report' });
  }
});

/**
 * @route   POST /api/field-reports
 * @desc    Submit a new field report
 * @access  Engineer, Admin
 */
router.post('/', 
  authenticateJWT(), 
  checkRole(['engineer', 'admin']), 
  async (req, res) => {
    const {
      report_date,
      job_location,
      job_type,
      client_name,
      job_title,
      job_description,
      work_performed,
      equipment_used,
      challenges_encountered,
      recommendations,
      start_time,
      end_time,
      total_hours
    } = req.body;

    const userId = req.user.id;

    // Validation
    if (!job_title || !work_performed) {
      return res.status(400).json({ 
        error: 'Job title and work performed are required' 
      });
    }

    try {
      // Get user's department
      const userDept = await pool.query(
        'SELECT department_id FROM users WHERE id = $1',
        [userId]
      );

      const departmentId = userDept.rows[0]?.department_id;

      const { rows } = await pool.query(
        `INSERT INTO field_reports (
          submitted_by,
          department_id,
          report_date,
          job_location,
          job_type,
          client_name,
          job_title,
          job_description,
          work_performed,
          equipment_used,
          challenges_encountered,
          recommendations,
          start_time,
          end_time,
          total_hours,
          status,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'Submitted', NOW(), NOW())
        RETURNING *`,
        [
          userId,
          departmentId,
          report_date || new Date(),
          job_location,
          job_type,
          client_name,
          job_title,
          job_description,
          work_performed,
          equipment_used,
          challenges_encountered,
          recommendations,
          start_time,
          end_time,
          total_hours
        ]
      );

      console.log(`✅ Field report #${rows[0].id} submitted by user #${userId}`);
      res.status(201).json({ 
        message: 'Field report submitted successfully',
        report: rows[0] 
      });
    } catch (err) {
      console.error('❌ Create field report error:', err);
      res.status(500).json({ 
        error: 'Failed to submit field report',
        details: err.message 
      });
    }
});

/**
 * @route   GET /api/field-reports/my-reports
 * @desc    Get all reports submitted by logged-in user
 * @access  Engineer, Admin
 */
router.get('/my-reports', authenticateJWT(), async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const { rows } = await pool.query(
      `SELECT 
        fr.*,
        u.name as submitted_by_name,
        d.name as department_name,
        r.name as reviewed_by_name
      FROM field_reports fr
      LEFT JOIN users u ON fr.submitted_by = u.id
      LEFT JOIN departments d ON fr.department_id = d.id
      LEFT JOIN users r ON fr.reviewed_by = r.id
      WHERE fr.submitted_by = $1
      ORDER BY fr.report_date DESC, fr.created_at DESC
      LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    res.json(rows);
  } catch (err) {
    console.error('❌ Get my reports error:', err);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

/**
 * @route   GET /api/field-reports/department
 * @desc    Get all reports for manager's department
 * @access  Manager, Admin
 */
router.get('/department', 
  authenticateJWT(), 
  checkRole(['manager', 'admin']), 
  async (req, res) => {
    try {
      let departmentId = req.user.department_id;

      // Admin can query specific department
      if (req.user.role === 'admin' && req.query.deptId) {
        departmentId = parseInt(req.query.deptId);
      }

      if (!departmentId) {
        return res.status(400).json({ error: 'Department not specified' });
      }

      const { rows } = await pool.query(
        `SELECT 
          fr.*,
          u.name as submitted_by_name,
          d.name as department_name,
          r.name as reviewed_by_name
        FROM field_reports fr
        LEFT JOIN users u ON fr.submitted_by = u.id
        LEFT JOIN departments d ON fr.department_id = d.id
        LEFT JOIN users r ON fr.reviewed_by = r.id
        WHERE fr.department_id = $1
        ORDER BY fr.report_date DESC, fr.created_at DESC`,
        [departmentId]
      );

      res.json(rows);
    } catch (err) {
      console.error('❌ Get department reports error:', err);
      res.status(500).json({ error: 'Failed to fetch department reports' });
    }
});

/**
 * @route   GET /api/field-reports/:id
 * @desc    Get a specific report
 * @access  Engineer (own), Manager (dept), Admin (all)
 */
router.get('/:id', authenticateJWT(), async (req, res) => {
  try {
    const reportId = req.params.id;

    const { rows } = await pool.query(
      `SELECT 
        fr.*,
        u.name as submitted_by_name,
        d.name as department_name,
        r.name as reviewed_by_name
      FROM field_reports fr
      LEFT JOIN users u ON fr.submitted_by = u.id
      LEFT JOIN departments d ON fr.department_id = d.id
      LEFT JOIN users r ON fr.reviewed_by = r.id
      WHERE fr.id = $1`,
      [reportId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const report = rows[0];

    // Authorization check
    if (req.user.role === 'engineer' && report.submitted_by !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to view this report' });
    }

    if (req.user.role === 'manager' && report.department_id !== req.user.department_id) {
      return res.status(403).json({ error: 'Not authorized to view this report' });
    }

    res.json(report);
  } catch (err) {
    console.error('❌ Get report error:', err);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

/**
 * @route   PATCH /api/field-reports/:id/review
 * @desc    Manager reviews a report
 * @access  Manager, Admin
 */
router.patch('/:id/review', 
  authenticateJWT(), 
  checkRole(['manager', 'admin']), 
  async (req, res) => {
    const reportId = req.params.id;
    const { status, review_notes } = req.body; // status: 'Reviewed' or 'Approved'
    const userId = req.user.id;

    if (!['Reviewed', 'Approved'].includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be "Reviewed" or "Approved"' 
      });
    }

    try {
      const { rows } = await pool.query(
        `UPDATE field_reports 
         SET status = $1,
             reviewed_by = $2,
             reviewed_at = NOW(),
             review_notes = $3,
             updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [status, userId, review_notes, reportId]
      );

      if (!rows.length) {
        return res.status(404).json({ error: 'Report not found' });
      }

      res.json({ 
        message: 'Report reviewed successfully',
        report: rows[0] 
      });
    } catch (err) {
      console.error('❌ Review report error:', err);
      res.status(500).json({ error: 'Failed to review report' });
    }
});

/**
 * @route   DELETE /api/field-reports/:id
 * @desc    Delete a report (only own reports, within 24 hours)
 * @access  Engineer, Admin
 */
router.delete('/:id', authenticateJWT(), async (req, res) => {
  const reportId = req.params.id;
  const userId = req.user.id;

  try {
    // Get report first
    const reportCheck = await pool.query(
      'SELECT submitted_by, created_at FROM field_reports WHERE id = $1',
      [reportId]
    );

    if (!reportCheck.rows.length) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const report = reportCheck.rows[0];

    // Authorization
    if (req.user.role !== 'admin' && report.submitted_by !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this report' });
    }

    // Time check (engineers can only delete within 24 hours)
    if (req.user.role === 'engineer') {
      const hoursSinceCreation = 
        (new Date() - new Date(report.created_at)) / (1000 * 60 * 60);
      
      if (hoursSinceCreation > 24) {
        return res.status(403).json({ 
          error: 'Reports can only be deleted within 24 hours of submission' 
        });
      }
    }

    await pool.query('DELETE FROM field_reports WHERE id = $1', [reportId]);
    
    res.json({ message: 'Report deleted successfully' });
  } catch (err) {
    console.error('❌ Delete report error:', err);
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

module.exports = router;