// src/components/Reports/ActivityFeed.jsx
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

  // Fetch activity logs
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
      console.log('✅ Activity logs loaded:', response.data.logs?.length || 0);
    } catch (err) {
      console.error('❌ Failed to load activity logs:', err);
      
      // Check if it's a 404 (route not found)
      if (err.response?.status === 404) {
        setError('Activity logging is not yet set up. Please integrate the activity logging system from the guide.');
      } else {
        setError(err.response?.data?.error || 'Failed to load activity logs');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await api.get('/activity-logs/stats');
      setStats(response.data);
    } catch (err) {
      console.error('❌ Failed to load stats:', err);
      // Don't show error for stats, just skip them
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchStats();
    // eslint-disable-next-line
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

  // Get icon for action type
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

  // Format date
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
    
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="reports-container">
      {/* Header */}
      <div className="reports-header">
        <div>
          <h1 className="reports-title">📋 Activity Feed</h1>
          <p style={{ color: '#666', marginBottom: '10px' }}>
            Track all actions and changes across the system
          </p>
          {userRole === 'engineer' && (
            <div style={{ 
              padding: '8px 16px', 
              background: '#e8f4f8', 
              borderLeft: '4px solid #0066cc',
              borderRadius: '4px',
              color: '#0066cc',
              display: 'inline-block',
              fontSize: '0.9rem'
            }}>
              Viewing your own activities
            </div>
          )}
          {userRole === 'manager' && (
            <div style={{ 
              padding: '8px 16px', 
              background: '#e8f4f8', 
              borderLeft: '4px solid #0066cc',
              borderRadius: '4px',
              color: '#0066cc',
              display: 'inline-block',
              fontSize: '0.9rem'
            }}>
              Viewing department activities
            </div>
          )}
          {userRole === 'admin' && (
            <div style={{ 
              padding: '8px 16px', 
              background: '#e8f4f8', 
              borderLeft: '4px solid #0066cc',
              borderRadius: '4px',
              color: '#0066cc',
              display: 'inline-block',
              fontSize: '0.9rem'
            }}>
              Viewing all system activities
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '20px', 
          marginBottom: '30px' 
        }}>
          <div style={{ 
            background: 'white', 
            padding: '20px', 
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#FF7F00' }}>
              {stats.total_activities || 0}
            </div>
            <div style={{ color: '#666', fontSize: '0.9rem' }}>Total Activities</div>
          </div>
          <div style={{ 
            background: 'white', 
            padding: '20px', 
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#FF7F00' }}>
              {stats.today || 0}
            </div>
            <div style={{ color: '#666', fontSize: '0.9rem' }}>Today</div>
          </div>
          <div style={{ 
            background: 'white', 
            padding: '20px', 
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#FF7F00' }}>
              {stats.this_week || 0}
            </div>
            <div style={{ color: '#666', fontSize: '0.9rem' }}>This Week</div>
          </div>
          <div style={{ 
            background: 'white', 
            padding: '20px', 
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#FF7F00' }}>
              {stats.this_month || 0}
            </div>
            <div style={{ color: '#666', fontSize: '0.9rem' }}>This Month</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="reports-filters" style={{ marginBottom: '30px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
            Action Type
          </label>
          <select 
            name="action_type" 
            value={filters.action_type} 
            onChange={handleFilterChange}
            className="type-filter"
            style={{ width: '100%' }}
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

        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
            Start Date
          </label>
          <input 
            type="date" 
            name="start_date" 
            value={filters.start_date} 
            onChange={handleFilterChange}
            className="date-filter"
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
            End Date
          </label>
          <input 
            type="date" 
            name="end_date" 
            value={filters.end_date} 
            onChange={handleFilterChange}
            className="date-filter"
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
          <button onClick={handleApplyFilters} className="filter-button">
            Apply Filters
          </button>
          <button 
            onClick={handleClearFilters} 
            className="debug-button"
            style={{ background: '#6c757d' }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Activity List */}
      {loading ? (
        <div className="reports-loading">
          <div style={{ textAlign: 'center' }}>Loading activities...</div>
        </div>
      ) : error ? (
        <div className="reports-error">
          <div style={{ 
            background: '#fff3cd', 
            border: '1px solid #ffc107',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#856404' }}>
              ⚠️ Activity Logging Not Yet Integrated
            </h3>
            <p style={{ margin: '0 0 15px 0', color: '#856404' }}>
              {error}
            </p>
            <p style={{ margin: 0, color: '#856404', fontSize: '0.9rem' }}>
              <strong>To enable activity logging:</strong><br />
              1. Create the <code>activityLogger.js</code> utility<br />
              2. Create the <code>activityLogs.js</code> route<br />
              3. Integrate logging into your existing routes<br />
              4. Refer to the integration guide provided earlier
            </p>
          </div>
          <button onClick={fetchLogs} className="filter-button">
            Retry
          </button>
        </div>
      ) : logs.length === 0 ? (
        <div className="no-reports">
          <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📭</div>
          <p style={{ fontSize: '1.2rem', marginBottom: '10px' }}>No activities found</p>
          <p style={{ color: '#666' }}>Activities will appear here as actions are performed</p>
        </div>
      ) : (
        <div className="reports-table-container">
          {logs.map((log) => (
            <div 
              key={log.id} 
              style={{ 
                display: 'flex',
                padding: '20px',
                borderBottom: '1px solid #f0f0f0',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#fafafa'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
            >
              <div style={{ fontSize: '2rem', marginRight: '15px' }}>
                {getActionIcon(log.action_type)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: '8px', lineHeight: '1.5' }}>
                  <strong style={{ color: '#FF7F00' }}>{log.user_name}</strong>{' '}
                  {log.description}
                </div>
                <div style={{ 
                  display: 'flex', 
                  gap: '15px', 
                  fontSize: '0.85rem', 
                  color: '#666' 
                }}>
                  <span style={{ 
                    padding: '2px 8px',
                    background: '#f0f0f0',
                    borderRadius: '3px',
                    fontWeight: '500'
                  }}>
                    {log.department_name || 'System'}
                  </span>
                  <span style={{ color: '#999' }}>
                    {formatDate(log.created_at)}
                  </span>
                </div>
                {log.entity_id && (
                  <div style={{ marginTop: '8px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      background: '#e8f4f8',
                      color: '#0066cc',
                      borderRadius: '3px',
                      fontSize: '0.8rem',
                      fontWeight: '500'
                    }}>
                      {log.entity_type} #{log.entity_id}
                    </span>
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