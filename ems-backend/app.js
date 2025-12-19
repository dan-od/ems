require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const pool = require('./config/db');
const authRoutes = require('./routes/auth');
const equipmentRoutes = require('./routes/equipment');
const assignmentRoutes = require('./routes/assignments');
const dashboardRoutes = require('./routes/dashboard');
const fieldReportsRoutes = require('./routes/fieldReports'); 
const requestRoutes = require('./routes/requests/index');
const reportsRoutes = require('./routes/reports');
const userRoutes = require('./routes/user');
const departmentRoutes = require('./routes/departments');
const maintenanceRequestRoutes = require('./routes/maintenanceRequests');
const statsRoutes = require('./routes/stats/managerStats');
const adminStatsRoutes = require('./routes/stats/adminStats');
const activityLogsRoutes = require('./routes/activityLogs');
const jobPreparationRoutes = require('./routes/jobPreparation');
const jobInspectionRoutes = require('./routes/jobInspections');

const app = express();
const path = require('path');

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://192.168.2.50:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());
app.use(cookieParser());

// ============================================
// DATABASE CONNECTION TEST
// ============================================
pool.query('SELECT NOW()', (err) => {
  if (err) console.error('❌ DB connection error:', err);
  else console.log('✅ DB connected');
});

// ============================================
// HEALTH CHECK
// ============================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// ============================================
// STATIC FILE SERVING (Upload Images)
// ============================================
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
console.log('📂 Static files: /uploads');

// ============================================
// REGISTER API ROUTES
// ============================================
console.log('\n🔹 Registering API routes...\n');

// Auth
app.use('/api/auth', authRoutes);
console.log('  ✅ /api/auth - Authentication');

// Equipment & Assignments
app.use('/api/equipment', equipmentRoutes);
console.log('  ✅ /api/equipment - Equipment Management');

app.use('/api/assignments', assignmentRoutes);
console.log('  ✅ /api/assignments - Equipment Assignments');

// Job Preparation (NEW)
app.use('/api/job-preparations', jobPreparationRoutes);
console.log('  ✅ /api/job-preparations - Job Preparation System');

app.use('/api/job-inspections', jobInspectionRoutes);
console.log('  ✅ /api/job-inspections - Pre/Post-Job Inspections');

// Requests System
app.use('/api/requests', requestRoutes);
console.log('  ✅ /api/requests - Request Hub');

app.use('/api/issues', require('./routes/issues'));
console.log('  ✅ /api/issues - Equipment Issues');

app.use('/api/returns', require('./routes/returns'));
console.log('  ✅ /api/returns - Equipment Returns');

app.use('/api/maintenance-requests', maintenanceRequestRoutes);
console.log('  ✅ /api/maintenance-requests - Maintenance Requests');

// Reports & Activity
app.use('/api/reports', reportsRoutes);
console.log('  ✅ /api/reports - Reports');

app.use('/api/field-reports', fieldReportsRoutes);
console.log('  ✅ /api/field-reports - Field Reports');

app.use('/api/activity-logs', activityLogsRoutes);
console.log('  ✅ /api/activity-logs - Activity Logs');

// Dashboard & Stats
app.use('/api/dashboard', dashboardRoutes);
console.log('  ✅ /api/dashboard - Dashboard Data');

app.use('/api/stats', statsRoutes);
console.log('  ✅ /api/stats - Manager Stats');

app.use('/api/stats', adminStatsRoutes);
console.log('  ✅ /api/stats - Admin Stats');

// User Management
app.use('/api/users', userRoutes);
console.log('  ✅ /api/users - User Management');

app.use('/api/departments', departmentRoutes);
console.log('  ✅ /api/departments - Department Management');

console.log('\n✅ All routes registered successfully!\n');

// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  res.status(500).json({ 
    error: 'Something broke!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log('═══════════════════════════════════════════════');
  console.log('🚀 Services EMS Backend Server');
  console.log('═══════════════════════════════════════════════');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Network: http://192.168.2.50:${PORT}`);
  console.log(`   Health:  http://localhost:${PORT}/api/health`);
  console.log('═══════════════════════════════════════════════\n');
});