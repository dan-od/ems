import React from 'react';
import EngineerDashboard from './Dashboards/EngineerDashboard';
import { Navigate } from 'react-router-dom';

const DashboardHome = () => {
  const userRole = localStorage.getItem('userRole') || '';

  // For now, only Engineer dashboard is implemented
  // Others will redirect to old dashboard temporarily
  if (userRole === 'engineer') {
    return <EngineerDashboard />;
  }

  // For other roles, show coming soon message for now
  return (
    <div className="coming-soon">
      <h1>🚧 {userRole.charAt(0).toUpperCase() + userRole.slice(1)} Dashboard</h1>
      <p>Your personalized dashboard is coming soon!</p>
      <p>For now, please use the navigation menu to access features.</p>
    </div>
  );
};

export default DashboardHome;