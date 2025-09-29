require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const pool = require('./config/db');
const authRoutes = require('./routes/auth');
const equipmentRoutes = require('./routes/equipment');
const assignmentRoutes = require('./routes/assignments');
const requestRoutes = require('./routes/requests');
const reportsRoutes = require('./routes/reports');
const userRoutes = require('./routes/user');
const departmentRoutes = require('./routes/departments');
const maintenanceRequestRoutes = require('./routes/maintenanceRequests');
const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
app.use(express.json());
app.use(cookieParser());

// Test DB connection (optional but recommended)
pool.query('SELECT NOW()', (err) => {
  if (err) console.error('❌ DB connection error:', err);
  else console.log('✅ DB connected');
});


// Simple test route (defined before other routes)
app.get('/api/wells', (req, res) => {
  res.json({ message: "This is the wells endpoint!" });
});

// Router middlewares - ADD CONSOLE LOGS
console.log('🔹 Starting route registration...');

app.use('/api/auth', authRoutes);
console.log('✅ Auth routes registered');

app.use('/api/equipment', equipmentRoutes);
console.log('✅ Equipment routes registered');

app.use('/api/assignments', assignmentRoutes);
console.log('✅ Assignment routes registered');

app.use('/api/requests', requestRoutes);
console.log('✅ Request routes registered');

app.use('/api/reports', reportsRoutes);
console.log('✅ Reports routes registered');

app.use('/api/users', userRoutes);
console.log('✅ User routes registered'); // This should show up

app.use('/api/issues', require('./routes/issues'));
console.log('✅ Issues routes registered');

app.use('/api/returns', require('./routes/returns'));
console.log('✅ Returns routes registered');

app.use('/api/departments', departmentRoutes);
console.log('✅ Department routes registered');

app.use('/api/maintenance-requests', maintenanceRequestRoutes);
console.log('✅ Department maintenance registered');


console.log('🔹 All routes registered successfully');

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// Start server (ONLY ONCE)
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));