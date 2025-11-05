// ems-frontend/src/components/Dashboard/Widgets/QuickActions.js
// FINAL FIX - Navigate to RequestHub exactly like your sidebar does

import React from 'react';
import { Link } from 'react-router-dom';
import './Widgets.css';

const QuickActions = ({ role }) => {

  const engineerActions = [
    {
      icon: '🚗',
      label: 'Request Transport',
      path: '/dashboard/requests',
      state: { requestType: 'Transport' }
    },
    {
      icon: '🔧',
      label: 'Report Equipment Issue',
      path: '/dashboard/requests',
      state: { requestType: 'Equipment' }
    },
    {
      icon: '🦺',
      label: 'Request PPE',
      path: '/dashboard/requests/ppe',
      state: { requestType: 'PPE' }
    },
    {
      icon: '📝',
      label: 'Submit Report',
      path: '/dashboard/field-reports/new',
      state: null
    }
  ];

  const managerActions = [
    {
      icon: '✅',
      label: 'Pending Approvals',
      path: '/dashboard/manager-requests'
    },
    {
      icon: '📊',
      label: 'Department Reports',
      path: '/dashboard/reports'
    },
    {
      icon: '👥',
      label: 'Manage Team',
      path: '/dashboard/users'
    },
    {
      icon: '🔄',
      label: 'Transfer History',
      path: '/dashboard/reports'
    }
  ];

  const adminActions = [
    {
      icon: '👤',
      label: 'Add User',
      path: '/dashboard/add-user'
    },
    {
      icon: '🏢',
      label: 'Manage Departments',
      path: '/dashboard/departments'
    },
    {
      icon: '📊',
      label: 'System Reports',
      path: '/dashboard/reports'
    },
    {
      icon: '⚙️',
      label: 'System Config',
      path: '/dashboard/settings'
    }
  ];

  const staffActions = [
    {
      icon: '🖥️',
      label: 'IT Support',
      path: '/dashboard/requests',
      state: { requestType: 'IT Support' }
    },
    {
      icon: '🗂️',
      label: 'Office Supplies',
      path: '/dashboard/requests',
      state: { requestType: 'Material' }
    },
    {
      icon: '🚗',
      label: 'Transport Booking',
      path: '/dashboard/requests',
      state: { requestType: 'Transport' }
    },
    {
      icon: '💰',
      label: 'Travel Advance',
      path: '/dashboard/requests',
      state: { requestType: 'Finance' }
    }
  ];

  const getActions = () => {
    switch (role) {
      case 'engineer': return engineerActions;
      case 'manager': return managerActions;
      case 'admin': return adminActions;
      case 'staff': return staffActions;
      default: return engineerActions;
    }
  };

  const actions = getActions();

  return (
    <div className="quick-actions-widget">
      <h3>⚡ Quick Actions</h3>
      <div className="quick-actions-grid">
        {actions.map((action, index) => (
          <Link
            key={index}
            to={action.path}
            state={action.state}
            className="quick-action-btn"
            style={{ textDecoration: 'none' }}
          >
            <span className="action-icon">{action.icon}</span>
            <span className="action-label">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;