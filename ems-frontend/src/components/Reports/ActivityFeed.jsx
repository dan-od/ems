// ems-frontend/src/components/Reports/ActivityFeed.jsx
// UPDATED - Request Hub style header card

import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './Reports.css';

const ActivityFeed = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    action_type: '',
    start_date: '',
    end_date: ''
  });
  const [stats, setStats] = useState(null);

  const userRole = localStorage.getItem('userRole');
  const userName = localStorage.getItem('userName');

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {};
      if (filters.action_type) params.action_type = filters.action_type;
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;

      const response = await api.get('/activity-logs', { params });
      setLogs(response.data.logs || []);
    } catch (err) {
      console.error('❌ Failed to load activity logs:', err);
      
      if (err.response?.status === 404) {
        setError('Activity logging is not yet set up.');
      } else {
        setError(err.response?.data?.error || 'Failed to load activity logs');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/activity-logs/stats');
      setStats(response.data);
    } catch (err) {
      console.error('❌ Failed to load stats:', err);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, []);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleApplyFilters = () => {
    fetchLogs();
  };

  const handleClearFilters = () => {
    setFilters({ action_type: '', start_date: '', end_date: '' });
    setTimeout(fetchLogs, 100);
  };

  const getActionIcon = (actionType) => {
    if (!actionType) return '📄';
    if (actionType.includes('login')) return '🔐';
    if (actionType.includes('equipment')) return '🔧';
    if (actionType.includes('request')) return '📦';
    if (actionType.includes('approved')) return '✅';
    if (actionType.includes('rejected')) return '❌';
    if (actionType.includes('report')) return '📋';
    if (actionType.includes('maintenance')) return '🛠️';
    if (actionType.includes('user')) return '👤';
    return '📄';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="reports-container">
      {/* ✅ Request Hub Style Header Card */}
      <div className="page-header-card">
        <div className="header-content">
          <h1 className="page-title">Activity Feed</h1>
          <p className="page-subtitle">
            Real-time system activity log and audit trail for all operations
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="stats-cards">
          <div className="stat-card">
            <div className="stat-value">{stats.today || 0}</div>
            <div className="stat-label">Today</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.this_week || 0}</div>
            <div className="stat-label">This Week</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.this_month || 0}</div>
            <div className="stat-label">This Month</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-section activity-filters">
        <div className="filter-group">
          <label>Action Type</label>
          <select 
            name="action_type" 
            value={filters.action_type} 
            onChange={handleFilterChange}
            className="filter-select"
          >
            <option value="">All Actions</option>
            <option value="login">Login</option>
            <option value="equipment_created">Equipment Created</option>
            <option value="equipment_modified">Equipment Modified</option>
            <option value="request_created">Request Created</option>
            <option value="request_approved">Request Approved</option>
            <option value="request_rejected">Request Rejected</option>
            <option value="request_transferred">Request Transferred</option>
            <option value="maintenance_logged">Maintenance Logged</option>
            <option value="report_submitted">Report Submitted</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Start Date</label>
          <input 
            type="date" 
            name="start_date" 
            value={filters.start_date} 
            onChange={handleFilterChange}
            className="filter-select"
          />
        </div>

        <div className="filter-group">
          <label>End Date</label>
          <input 
            type="date" 
            name="end_date" 
            value={filters.end_date} 
            onChange={handleFilterChange}
            className="filter-select"
          />
        </div>

        <div className="filter-actions">
          <button onClick={handleApplyFilters} className="btn-primary">
            Apply
          </button>
          <button onClick={handleClearFilters} className="btn-secondary">
            Clear
          </button>
        </div>
      </div>

      {/* Activity List */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <div>Loading activities...</div>
        </div>
      ) : error ? (
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Activity Logging Not Yet Integrated</h3>
          <p>{error}</p>
          <button onClick={fetchLogs} className="btn-primary">
            Retry
          </button>
        </div>
      ) : logs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>No activities found</h3>
          <p>Activities will appear here as actions are performed</p>
        </div>
      ) : (
        <div className="activity-list">
          {logs.map((log) => (
            <div key={log.id} className="activity-item">
              <div className="activity-icon">
                {getActionIcon(log.action_type)}
              </div>
              <div className="activity-content">
                <div className="activity-description">
                  <strong>{log.user_name}</strong> {log.description}
                </div>
                <div className="activity-meta">
                  <span className="meta-department">
                    {log.department_name || 'System'}
                  </span>
                  <span className="meta-time">
                    {formatDate(log.created_at)}
                  </span>
                </div>
                {log.entity_id && (
                  <div className="activity-entity">
                    {log.entity_type} #{log.entity_id}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;