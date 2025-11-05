// src/App.js - CORRECTED VERSION (matches actual file structure)
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// ============================================
// AUTH
// ============================================
import Login from './components/Auth/Login';

// ============================================
// DASHBOARD LAYOUT
// ============================================
import Dashboard from './components/Dashboard/dashboard';
import DashboardHome from './components/Dashboard/DashboardHome';

// ============================================
// EQUIPMENT (Using actual files that exist)
// ============================================
import EquipmentList from './components/Equipment/EquipmentList';
import MaintenanceLog from './components/Equipment/MaintenanceLog';

// ============================================
// REQUESTS (Using actual files that exist)
// ============================================
import RequestHub from './components/RequestHub/RequestHub';
import RequestList from './components/Requests/RequestList';
import RecentRequests from './components/Requests/RecentRequests';
import ManagerRequests from './components/Requests/ManagerRequests';
import RequestDetail from './components/Requests/RequestDetail';

// ============================================
// REPORTS & ACTIVITY
// ============================================
import { 
  ReportsList as FieldReportsList,
  FieldReportForm,
  ReportDetail,
  EquipmentMaintenanceLogs,
  ActivityFeed,
  DepartmentReports
} from './components/Reports';

// ============================================
// USERS (ADMIN) - Using actual files
// ============================================
import UserManagement from './components/User/UserManagement';
import AddUser from './components/User/AddUser';

// ============================================
// PROTECTED ROUTE COMPONENT
// ============================================
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

// ============================================
// MAIN APP
// ============================================
function App() {
  return (
    <Router>
      <Routes>
        {/* ==========================================
            PUBLIC ROUTES
            ========================================== */}
        <Route path="/" element={<Login />} />

        {/* ==========================================
            PROTECTED DASHBOARD ROUTES
            ========================================== */}
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
          <Route path="equipment" element={<EquipmentList />} />
          <Route path="maintenance-logs" element={<MaintenanceLog />} />

          {/* ==========================================
              REQUEST ROUTES
              ========================================== */}
          <Route path="requests" element={<RequestHub />} />
          <Route path="all-requests" element={<RequestList />} />
          <Route path="recent-requests" element={<RecentRequests />} />
          <Route path="request/:id" element={<RequestDetail />} />
          
          {/* Manager/Admin Only - Department Requests */}
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
          
          {/* Activity Feed - All user actions */}
          <Route path="activity-feed" element={<ActivityFeed />} />
          
          {/* Equipment Maintenance Logs - Historical logs */}
          <Route path="equipment-maintenance-logs" element={<EquipmentMaintenanceLogs />} />
          
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
          <Route path="field-reports" element={<FieldReportsList />} />
          <Route path="field-reports/new" element={<FieldReportForm />} />
          <Route path="field-reports/:id" element={<ReportDetail />} />

          {/* ==========================================
              ADMIN ROUTES
              ========================================== */}
          <Route
            path="users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <UserManagement />
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
              LEGACY ROUTES - REDIRECTS
              ========================================== */}
          <Route 
            path="under-maintenance" 
            element={<Navigate to="/dashboard/maintenance-logs" replace />} 
          />
          <Route 
            path="logs" 
            element={<Navigate to="/dashboard/maintenance-logs" replace />} 
          />
          
          {/* Redirect old equipment routes */}
          <Route 
            path="all-equipment" 
            element={<Navigate to="/dashboard/equipment" replace />} 
          />
          <Route 
            path="my-requests" 
            element={<Navigate to="/dashboard/recent-requests" replace />} 
          />
        </Route>

        {/* ==========================================
            CATCH ALL - REDIRECT TO LOGIN
            ========================================== */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;