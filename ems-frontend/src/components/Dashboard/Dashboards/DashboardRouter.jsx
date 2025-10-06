// ems-frontend/src/components/Dashboard/DashboardRouter.jsx
import React from 'react';
import EngineerDashboard from './RoleSpecific/EngineerDashboard';
import ManagerDashboard from './RoleSpecific/ManagerDashboard';
import AdminDashboard from './RoleSpecific/AdminDashboard';
import StaffDashboard from './RoleSpecific/StaffDashboard';

/**
 * DashboardRouter - Routes to role-specific dashboards
 * 
 * Instead of using conditional rendering in one component,
 * we load completely different dashboard components based on user role.
 * 
 * This keeps dashboards modular, maintainable, and role-specific.
 */
const DashboardRouter = () => {
  const userRole = localStorage.getItem('userRole');

  // Role-based routing
  switch (userRole) {
    case 'engineer':
      return <EngineerDashboard />;
    
    case 'manager':
      return <ManagerDashboard />;
    
    case 'admin':
      return <AdminDashboard />;
    
    case 'staff':
      return <StaffDashboard />;
    
    default:
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Unauthorized Access
            </h2>
            <p className="text-gray-600">
              Your role ({userRole || 'unknown'}) does not have dashboard access.
            </p>
            <p className="text-gray-600 mt-2">
              Please contact your administrator.
            </p>
          </div>
        </div>
      );
  }
};

export default DashboardRouter;