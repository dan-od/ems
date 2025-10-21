// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Auth
import Login from './components/Auth/Login';

// Dashboard Layout
import Dashboard from './components/Dashboard/Dashboard';
import DashboardHome from './components/Dashboard/DashboardHome';

// Equipment
import AllEquipment from './components/Equipment/AllEquipment';
import EquipmentDetail from './components/Equipment/EquipmentDetail';

// Maintenance Logs (Equipment service history)
import MaintenanceLogs from './components/Equipment/MaintenanceLog'; // Or wherever it's located

// Requests
import RequestHub from './components/RequestHub/RequestHub';
import MyRequests from './components/Requests/MyRequests';
import ManagerRequests from './components/Requests/ManagerRequests';

// Reports & Activity
import ActivityFeed from './components/Reports/ActivityFeed'; // ✅ NEW - You'll create this
import DepartmentReports from './components/Reports/DepartmentReports'; // ✅ For manager/admin

// Field Reports
import FieldReports from './components/FieldReports/FieldReports';

// Users (Admin)
import Users from './components/User/Users';
import AddUser from './components/User/AddUser';

import { 
  ReportsList as FieldReports,
  FieldReportForm,
  ReportDetail,
  EquipmentMaintenanceLogs,
  ActivityFeed,           // ⭐ NEW
  DepartmentReports       // ⭐ NEW
} from './components/Reports';


// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole');

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Route */}
        <Route path="/" element={<Login />} />

        {/* Protected Dashboard Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        >
          {/* Dashboard Home */}
          <Route index element={<DashboardHome />} />

          {/* ==========================================
              EQUIPMENT ROUTES
              ========================================== */}
          <Route path="all-equipment" element={<AllEquipment />} />
          <Route path="equipment/:id" element={<EquipmentDetail />} />
          
          {/* Equipment Maintenance Logs */}
          <Route path="maintenance-logs" element={<MaintenanceLogs />} />

          {/* ==========================================
              REQUEST ROUTES
              ========================================== */}
          <Route path="requests" element={<RequestHub />} />
          <Route path="my-requests" element={<MyRequests />} />
          
          {/* Manager/Admin Only */}
          <Route
            path="manager-requests"
            element={
              <ProtectedRoute allowedRoles={['manager', 'admin']}>
                <ManagerRequests />
              </ProtectedRoute>
            }
          />

          {/* ==========================================
              REPORTING & MONITORING ROUTES
              ========================================== */}
          
          {/* Activity Feed - All user actions (NEW) */}
          <Route path="activity-feed" element={<ActivityFeed />} />
          
          {/* Department Reports - Manager/Admin Only */}
          <Route
            path="reports"
            element={
              <ProtectedRoute allowedRoles={['manager', 'admin']}>
                <DepartmentReports />
              </ProtectedRoute>
            }
          />


          {/* Field Reports - Job site reports */}
          <Route path="field-reports" element={<FieldReports />} />

          {/* ==========================================
              ADMIN ROUTES
              ========================================== */}
          <Route
            path="users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Users />
              </ProtectedRoute>
            }
          />
          <Route
            path="add-user"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AddUser />
              </ProtectedRoute>
            }
          />

          {/* ==========================================
              LEGACY/OLD ROUTES - REDIRECTS
              ========================================== */}
          {/* Redirect old routes to new ones */}
          <Route path="under-maintenance" element={<Navigate to="/dashboard/maintenance-logs" replace />} />
          <Route path="logs" element={<Navigate to="/dashboard/maintenance-logs" replace />} />
        </Route>

        {/* Catch all - redirect to login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;