// ems-backend/routes/fieldReports.js - ENHANCED VERSION
const express = require('express');
const router = express.Router();
const { authenticateJWT, checkRole } = require('../middleware/auth');
const pool = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/field-reports');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${req.user.id}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, Word, Excel, and images allowed.'));
    }
  }
});

/**
 * @route   GET /api/field-reports
 * @desc    Get field reports (Admin sees all, Engineers/Staff see only their own)
 * @access  Engineer, Manager, Admin
 */
router.get('/', authenticateJWT(), async (req, res) => {
  try {
    const { role, id: userId, department_id } = req.user;
    const { 
      status, 
      department, 
      start_date, 
      end_date,
      submitted_by,
      limit = 50,
      offset = 0 
    } = req.query;

    console.log(`\n📋 [FIELD REPORTS] Fetching reports for user #${userId} (${role})`);

    let query = `
      SELECT 
        fr.*,
        u.name as submitted_by_name,
        u.role as submitted_by_role,
        d.name as department_name,
        reviewer.name as reviewed_by_name
      FROM field_reports fr
      LEFT JOIN users u ON fr.submitted_by = u.id
      LEFT JOIN departments d ON fr.department_id = d.id
      LEFT JOIN users reviewer ON fr.reviewed_by = reviewer.id
      WHERE 1=1
    `;

    const queryParams = [];
    let paramIndex = 1;

    // Role-based filtering
    if (role === 'engineer' || role === 'staff') {
      // Engineers and staff see only their own reports
      query += ` AND fr.submitted_by = $${paramIndex}`;
      queryParams.push(userId);
      paramIndex++;
    } else if (role === 'manager') {
      // Managers see reports from their department
      if (department_id) {
        query += ` AND fr.department_id = $${paramIndex}`;
        queryParams.push(department_id);
        paramIndex++;
      }
    }
    // Admin sees all reports - no additional filter

    // Additional filters (work for all roles within their scope)
    if (status) {
      query += ` AND fr.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (department && role === 'admin') {
      // Only admins can filter by department
      query += ` AND fr.department_id = $${paramIndex}`;
      queryParams.push(parseInt(department));
      paramIndex++;
    }

    if (submitted_by && role === 'admin') {
      // Only admins can filter by specific user
      query += ` AND fr.submitted_by = $${paramIndex}`;
      queryParams.push(parseInt(submitted_by));
      paramIndex++;
    }

    if (start_date) {
      query += ` AND fr.report_date >= $${paramIndex}`;
      queryParams.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      query += ` AND fr.report_date <= $${paramIndex}`;
      queryParams.push(end_date);
      paramIndex++;
    }

    // Order and pagination
    query += ` ORDER BY fr.report_date DESC, fr.created_at DESC`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(parseInt(limit), parseInt(offset));

    const { rows } = await pool.query(query, queryParams);

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) FROM field_reports fr WHERE 1=1`;
    const countParams = [];
    let countIndex = 1;

    if (role === 'engineer' || role === 'staff') {
      countQuery += ` AND fr.submitted_by = $${countIndex}`;
      countParams.push(userId);
      countIndex++;
    } else if (role === 'manager' && department_id) {
      countQuery += ` AND fr.department_id = $${countIndex}`;
      countParams.push(department_id);
      countIndex++;
    }

    if (status) {
      countQuery += ` AND fr.status = $${countIndex}`;
      countParams.push(status);
      countIndex++;
    }

    const { rows: countRows } = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countRows[0].count);

    console.log(`✅ Found ${rows.length} reports (${totalCount} total)`);

    res.json({
      reports: rows,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: totalCount > parseInt(offset) + rows.length
      },
      userRole: role
    });

  } catch (err) {
    console.error('❌ Get field reports error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch field reports',
      details: err.message 
    });
  }
});

/**
 * @route   GET /api/field-reports/stats
 * @desc    Get field reports statistics (Admin sees all, others see their scope)
 * @access  Engineer, Manager, Admin
 */
router.get('/stats', authenticateJWT(), async (req, res) => {
  try {
    const { role, id: userId, department_id } = req.user;

    let whereClause = '1=1';
    const queryParams = [];

    if (role === 'engineer' || role === 'staff') {
      whereClause = 'submitted_by = $1';
      queryParams.push(userId);
    } else if (role === 'manager' && department_id) {
      whereClause = 'department_id = $1';
      queryParams.push(department_id);
    }

    const statsQuery = `
      SELECT 
        COUNT(*) as total_reports,
        COUNT(CASE WHEN status = 'Submitted' THEN 1 END) as submitted_count,
        COUNT(CASE WHEN status = 'Reviewed' THEN 1 END) as reviewed_count,
        COUNT(CASE WHEN status = 'Approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN status = 'Rejected' THEN 1 END) as rejected_count,
        COUNT(CASE WHEN report_date >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as this_month_count,
        COUNT(CASE WHEN report_date >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as this_week_count
      FROM field_reports
      WHERE ${whereClause}
    `;

    const { rows } = await pool.query(statsQuery, queryParams);

    res.json(rows[0] || {});

  } catch (err) {
    console.error('❌ Get field reports stats error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch field reports stats',
      details: err.message 
    });
  }
});

/**
 * @route   GET /api/field-reports/filters
 * @desc    Get filter options (departments, users) - Admin only
 * @access  Admin
 */
router.get('/filters', authenticateJWT(), checkRole(['admin']), async (req, res) => {
  try {
    const [departmentsResult, usersResult] = await Promise.all([
      pool.query(`
        SELECT id, name 
        FROM departments 
        ORDER BY name
      `),
      pool.query(`
        SELECT u.id, u.name, u.role, d.name as department_name
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE u.role IN ('engineer', 'staff', 'manager')
          AND u.email != 'deleted@system.local'
        ORDER BY u.name
      `)
    ]);

    res.json({
      departments: departmentsResult.rows,
      users: usersResult.rows
    });

  } catch (err) {
    console.error('❌ Get filter options error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch filter options',
      details: err.message 
    });
  }
});

/**
 * @route   GET /api/field-reports/:id
 * @desc    Get single field report
 * @access  Engineer (own), Manager (dept), Admin (all)
 */
router.get('/:id', authenticateJWT(), async (req, res) => {
  try {
    const { id: userId, role, department_id } = req.user;
    const reportId = req.params.id;

    const { rows } = await pool.query(`
      SELECT 
        fr.*,
        u.name as submitted_by_name,
        u.role as submitted_by_role,
        d.name as department_name,
        reviewer.name as reviewed_by_name
      FROM field_reports fr
      LEFT JOIN users u ON fr.submitted_by = u.id
      LEFT JOIN departments d ON fr.department_id = d.id
      LEFT JOIN users reviewer ON fr.reviewed_by = reviewer.id
      WHERE fr.id = $1
    `, [reportId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const report = rows[0];

    // Access control
    if (role === 'engineer' || role === 'staff') {
      if (report.submitted_by !== userId) {
        return res.status(403).json({ error: 'Not authorized to view this report' });
      }
    } else if (role === 'manager') {
      if (report.department_id !== department_id) {
        return res.status(403).json({ error: 'Not authorized to view this report' });
      }
    }
    // Admin can view all

    res.json(report);

  } catch (err) {
    console.error('❌ Get single report error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch report',
      details: err.message 
    });
  }
});

/**
 * @route   POST /api/field-reports
 * @desc    Create new field report with optional file upload
 * @access  Engineer, Staff
 */
router.post('/', 
  authenticateJWT(), 
  checkRole(['engineer', 'staff', 'admin']),
  upload.single('attachment'),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const departmentId = req.user.department_id;

      const {
        job_title,
        job_location,
        job_type,
        client_name,
        job_description,
        work_performed,
        equipment_used,
        challenges_encountered,
        recommendations,
        start_time,
        end_time,
        report_date
      } = req.body;

      // Calculate total hours if start and end times provided
      let totalHours = null;
      if (start_time && end_time) {
        const start = new Date(start_time);
        const end = new Date(end_time);
        totalHours = (end - start) / (1000 * 60 * 60); // Convert to hours
      }

      // Handle file attachment
      let attachmentPath = null;
      let attachmentFilename = null;
      let attachmentType = null;

      if (req.file) {
        attachmentPath = req.file.path;
        attachmentFilename = req.file.originalname;
        attachmentType = req.file.mimetype;
      }

      const { rows } = await pool.query(`
        INSERT INTO field_reports (
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
          attachment_path,
          attachment_filename,
          attachment_type,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'Submitted')
        RETURNING *
      `, [
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
        totalHours,
        attachmentPath,
        attachmentFilename,
        attachmentType
      ]);

      console.log(`✅ Field report created: #${rows[0].id} by user #${userId}`);

      res.status(201).json({
        message: 'Field report submitted successfully',
        report: rows[0]
      });

    } catch (err) {
      console.error('❌ Create field report error:', err);
      res.status(500).json({ 
        error: 'Failed to create field report',
        details: err.message 
      });
    }
  }
);

/**
 * @route   PATCH /api/field-reports/:id/review
 * @desc    Review a field report (Manager, Admin)
 * @access  Manager, Admin
 */
router.patch('/:id/review',
  authenticateJWT(),
  checkRole(['manager', 'admin']),
  async (req, res) => {
    try {
      const reportId = req.params.id;
      const { status, review_notes } = req.body;
      const reviewerId = req.user.id;

      if (!['Reviewed', 'Approved', 'Rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const { rows } = await pool.query(`
        UPDATE field_reports
        SET 
          status = $1,
          reviewed_by = $2,
          reviewed_at = NOW(),
          review_notes = $3,
          updated_at = NOW()
        WHERE id = $4
        RETURNING *
      `, [status, reviewerId, review_notes, reportId]);

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Report not found' });
      }

      console.log(`✅ Report #${reportId} reviewed by user #${reviewerId}: ${status}`);

      res.json({
        message: 'Report reviewed successfully',
        report: rows[0]
      });

    } catch (err) {
      console.error('❌ Review report error:', err);
      res.status(500).json({ 
        error: 'Failed to review report',
        details: err.message 
      });
    }
  }
);

/**
 * @route   DELETE /api/field-reports/:id
 * @desc    Delete field report (Admin only or own report if not reviewed)
 * @access  Engineer (own unreviewed), Admin
 */
router.delete('/:id', authenticateJWT(), async (req, res) => {
  try {
    const reportId = req.params.id;
    const { id: userId, role } = req.user;

    // Get report first
    const { rows: reportRows } = await pool.query(
      'SELECT * FROM field_reports WHERE id = $1',
      [reportId]
    );

    if (reportRows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const report = reportRows[0];

    // Access control
    if (role !== 'admin') {
      if (report.submitted_by !== userId) {
        return res.status(403).json({ error: 'Not authorized' });
      }
      if (report.status !== 'Submitted') {
        return res.status(403).json({ error: 'Cannot delete reviewed reports' });
      }
    }

    // Delete file if exists
    if (report.attachment_path && fs.existsSync(report.attachment_path)) {
      fs.unlinkSync(report.attachment_path);
    }

    await pool.query('DELETE FROM field_reports WHERE id = $1', [reportId]);

    console.log(`✅ Report #${reportId} deleted by user #${userId}`);

    res.json({ message: 'Report deleted successfully' });

  } catch (err) {
    console.error('❌ Delete report error:', err);
    res.status(500).json({ 
      error: 'Failed to delete report',
      details: err.message 
    });
  }
});

module.exports = router;