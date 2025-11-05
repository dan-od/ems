// ems-frontend/src/components/Dashboard/Widgets/QuickActions.js
// ONLY CHANGE THE ROUTES - Keep everything else the same

import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Widgets.css';

const QuickActions = ({ role }) => {
  const navigate = useNavigate();

  const engineerActions = [
    {
      icon: '🚗',
      label: 'Request Transport',
      action: () => navigate('/dashboard/requests/new?type=transport')  // FIXED ROUTE
    },
    {
      icon: '🔧',
      label: 'Report Equipment Issue',
      action: () => navigate('/dashboard/requests/new?type=equipment')  // FIXED ROUTE
    },
    {
      icon: '🦺',
      label: 'Request PPE',
      action: () => navigate('/dashboard/requests/new?type=ppe')  // FIXED ROUTE
    },
    {
      icon: '📝',
      label: 'Submit Report',
      action: () => navigate('/dashboard/field-reports/new')  // FIXED ROUTE - added /new
    }
  ];

  const managerActions = [
    {
      icon: '✅',
      label: 'Pending Approvals',
      action: () => navigate('/dashboard/manager-requests')
    },
    {
      icon: '📊',
      label: 'Department Reports',
      action: () => navigate('/dashboard/reports')
    },
    {
      icon: '👥',
      label: 'Manage Team',
      action: () => navigate('/dashboard/users')
    },
    {
      icon: '🔄',
      label: 'Transfer History',
      action: () => navigate('/dashboard/reports')
    }
  ];

  const adminActions = [
    {
      icon: '👤',
      label: 'Add User',
      action: () => navigate('/dashboard/add-user')
    },
    {
      icon: '🏢',
      label: 'Manage Departments',
      action: () => navigate('/dashboard/departments')
    },
    {
      icon: '📊',
      label: 'System Reports',
      action: () => navigate('/dashboard/reports')
    },
    {
      icon: '⚙️',
      label: 'System Config',
      action: () => navigate('/dashboard/settings')
    }
  ];

  const staffActions = [
    {
      icon: '🖥️',
      label: 'IT Support',
      action: () => navigate('/dashboard/requests/new?type=it')  // FIXED ROUTE
    },
    {
      icon: '🗂️',
      label: 'Office Supplies',
      action: () => navigate('/dashboard/requests/new?type=material')  // FIXED ROUTE
    },
    {
      icon: '🚗',
      label: 'Transport Booking',
      action: () => navigate('/dashboard/requests/new?type=transport')  // FIXED ROUTE
    },
    {
      icon: '💰',
      label: 'Travel Advance',
      action: () => navigate('/dashboard/requests/new?type=finance')  // FIXED ROUTE
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
          <button
            key={index}
            className="quick-action-btn"
            onClick={action.action}
            type="button"  // Important: prevents form submission
          >
            <span className="action-icon">{action.icon}</span>
            <span className="action-label">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;