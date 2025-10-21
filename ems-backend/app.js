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

const app = express();

// Middleware
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

// Test DB connection
pool.query('SELECT NOW()', (err) => {
  if (err) console.error('❌ DB connection error:', err);
  else console.log('✅ DB connected');
});

// Test route
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Router middlewares
console.log('🔹 Registering routes...');

app.use('/api/auth', authRoutes);
console.log('  ✅ Auth');

app.use('/api/equipment', equipmentRoutes);
console.log('  ✅ Equipment');

app.use('/api/assignments', assignmentRoutes);
console.log('  ✅ Assignments');

app.use('/api/requests', requestRoutes);
console.log('  ✅ Requests');

app.use('/api/reports', reportsRoutes);
console.log('  ✅ Reports');

app.use('/api/users', userRoutes);
console.log('  ✅ Users');

app.use('/api/issues', require('./routes/issues'));
console.log('  ✅ Issues');

app.use('/api/returns', require('./routes/returns'));
console.log('  ✅ Returns');

app.use('/api/departments', departmentRoutes);
console.log('  ✅ Departments');

app.use('/api/maintenance-requests', maintenanceRequestRoutes);
console.log('  ✅ Maintenance');

app.use('/api/dashboard', dashboardRoutes);
console.log('  ✅ Dashboard');

app.use('/api/field-reports', fieldReportsRoutes);
console.log('  ✅ Field Reports');

app.use('/api/stats', statsRoutes);
console.log('  ✅ Stats (Manager)');

app.use('/api/stats', adminStatsRoutes);
console.log('  ✅ Stats (Admin)');

console.log('✅ All routes registered\n');

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Network: http://192.168.2.50:${PORT}`);
});