// ems-frontend/src/App.js
// FRONTEND ROUTING - React Router Configuration

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
// EQUIPMENT
// ============================================
import EquipmentList from './components/Equipment/EquipmentList';
import MaintenanceLog from './components/Equipment/MaintenanceLog';

// ============================================
// REQUESTS & REQUEST HUB
// ============================================
import RequestHub from './components/RequestHub/RequestHub';
import PPEForm from './components/RequestHub/PPEForm';
import MaterialForm from './components/RequestHub/MaterialForm';
import EquipmentRequestForm from './components/RequestHub/EquipmentRequestForm';
import TransportForm from './components/RequestHub/TransportForm';
import MaintenanceForm from './components/RequestHub/MaintenanceForm';
import MyRequests from './components/Requests/RecentRequests';
import ManagerRequests from './components/Requests/ManagerRequests';
import RequestDetail from './components/Requests/RequestDetail';

// ============================================
// REPORTS & ACTIVITY
// ============================================
import ActivityFeed from './components/Reports/ActivityFeed';
import DepartmentReports from './components/Reports/DepartmentReports';
import FieldReportsList from './components/Reports/ReportsList';
import FieldReportForm from './components/Reports/FieldReportForm';
import ReportDetail from './components/Reports/ReportDetail';

// ============================================
// JOB PREPARATION & INSPECTIONS (NEW)
// ============================================
import JobPreparationHub from './components/JobPreparation/JobPreparationHub';
import JobPreparationForm from './components/JobPreparation/JobPreparationForm';
import JobPreparationDetail from './components/JobPreparation/JobPreparationDetail';

// ============================================
// USERS (ADMIN)
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
          <Route path="maintenance" element={<MaintenanceLog />} />
          <Route path="maintenance-logs" element={<MaintenanceLog />} />

          {/* ==========================================
              JOB PREPARATION ROUTES (NEW)
              ========================================== */}
          <Route path="job-preparation">
            {/* Job Preparation Hub - Main List */}
            <Route index element={<JobPreparationHub />} />
            
            {/* Create New Job Preparation */}
            <Route path="new" element={<JobPreparationForm />} />
            
            {/* View Job Preparation Details (with Pre/Post-Job tabs) */}
            <Route path=":id" element={<JobPreparationDetail />} />
            
            {/* Edit Job Preparation */}
            <Route path=":id/edit" element={<JobPreparationForm />} />
          </Route>

          {/* ==========================================
              REQUEST HUB AND FORMS
              ========================================== */}
          <Route path="requests">
            {/* Request Hub - Main Page */}
            <Route index element={<RequestHub />} />
            
            {/* Individual Request Forms */}
            <Route path="ppe" element={<PPEForm />} />
            <Route path="material" element={<MaterialForm />} />
            <Route path="equipment" element={<EquipmentRequestForm />} />
            <Route path="transport" element={<TransportForm />} />
            <Route path="maintenance" element={<MaintenanceForm />} />
            
            {/* View specific request */}
            <Route path="view/:id" element={<RequestDetail />} />
          </Route>
          
          {/* Alternative route for request details */}
          <Route path="request/:id" element={<RequestDetail />} />

          {/* My Requests Page */}
          <Route path="my-requests" element={<MyRequests />} />
          
          {/* Recent Requests */}
          <Route path="recent-requests" element={<MyRequests />} />

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
          
          {/* Activity Feed */}
          <Route path="activity" element={<ActivityFeed />} />
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

          {/* Field Reports */}
          <Route path="field-reports">
            <Route index element={<FieldReportsList />} />
            <Route path="new" element={<FieldReportForm />} />
            <Route path=":id" element={<ReportDetail />} />
          </Route>

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
            path="all-equipment" 
            element={<Navigate to="/dashboard/equipment" replace />} 
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