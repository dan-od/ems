// src/components/Dashboard/DashboardHome.js
import React from 'react';
import EngineerDashboard from './RoleSpecific/EngineerDashboard';
import ManagerDashboard from './RoleSpecific/ManagerDashboard';
import AdminDashboard from './RoleSpecific/AdminDashboard';
import StaffDashboard from './RoleSpecific/StaffDashboard';

const DashboardHome = () => {
  const userRole = localStorage.getItem('userRole') || '';

  // Route to appropriate role-specific dashboard
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
        <div className="coming-soon">
          <h1>🚧 Dashboard Not Available</h1>
          <p>Your role ({userRole}) does not have a dashboard configured.</p>
          <p>Please contact your administrator or use the navigation menu to access features.</p>
        </div>
      );
  }
};

export default DashboardHome;