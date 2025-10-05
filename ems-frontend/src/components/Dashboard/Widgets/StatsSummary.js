import React from 'react';
import './Widgets.css';

const StatsSummary = ({ stats, loading, role }) => {
  if (loading) {
    return (
      <div className="stats-summary loading">
        <div className="stat-card skeleton"></div>
        <div className="stat-card skeleton"></div>
        <div className="stat-card skeleton"></div>
        <div className="stat-card skeleton"></div>
      </div>
    );
  }

  const engineerStats = [
    { label: 'Active Requests', value: stats.active_requests || 0, icon: '📋', color: 'blue' },
    { label: 'Pending Approval', value: stats.pending_requests || 0, icon: '⏳', color: 'yellow' },
    { label: 'Assigned Equipment', value: stats.assigned_equipment || 0, icon: '🛠️', color: 'green' },
    { label: 'Needs Attention', value: stats.equipment_needing_attention || 0, icon: '⚠️', color: 'red' }
  ];

  const managerStats = [
    { label: 'Pending Approvals', value: stats.pending_approvals || 0, icon: '⏳', color: 'yellow' },
    { label: 'Urgent', value: stats.urgent_approvals || 0, icon: '🔴', color: 'red' },
    { label: 'Active Jobs', value: stats.active_jobs || 0, icon: '✅', color: 'green' },
    { label: 'Team Members', value: stats.team_members || 0, icon: '👥', color: 'blue' }
  ];

  const adminStats = [
    { label: 'Total Users', value: stats.total_users || 0, icon: '👤', color: 'blue' },
    { label: 'Pending Requests', value: stats.pending_requests || 0, icon: '⏳', color: 'yellow' },
    { label: 'Total Equipment', value: stats.total_equipment || 0, icon: '🛠️', color: 'green' },
    { label: 'Departments', value: stats.departments_count || 0, icon: '🏢', color: 'purple' }
  ];

  const getStatsForRole = () => {
    switch (role) {
      case 'engineer': return engineerStats;
      case 'manager': return managerStats;
      case 'admin': return adminStats;
      case 'staff': return engineerStats; // Staff use similar stats to engineer
      default: return engineerStats;
    }
  };

  const displayStats = getStatsForRole();

  return (
    <div className="stats-summary">
      {displayStats.map((stat, index) => (
        <div key={index} className={`stat-card stat-${stat.color}`}>
          <div className="stat-icon">{stat.icon}</div>
          <div className="stat-content">
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsSummary;