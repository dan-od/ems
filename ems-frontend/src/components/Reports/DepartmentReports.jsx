// src/components/Reports/DepartmentReports.jsx
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './Reports.css';

const DepartmentReports = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: ''
  });

  const userRole = localStorage.getItem('userRole');
  const departmentName = localStorage.getItem('departmentName') || 'Your Department';

  const fetchActivities = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await api.get('/reports/department-activity', { params });

      setActivities(response.data || []);
      console.log('✅ Department activities loaded:', response.data?.length || 0);
    } catch (err) {
      console.error('❌ Failed to load activities:', err);
      setError(err.response?.data?.error || 'Failed to load department activities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
    // eslint-disable-next-line
  }, []);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleApplyFilters = () => {
    fetchActivities();
  };

  const getActivityIcon = (activityType) => {
    if (!activityType) return '📋';
    if (activityType === 'Approval') return '✅';
    if (activityType === 'Rejection') return '❌';
    if (activityType.includes('Transfer')) return '🔄';
    return '📋';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
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
      <div className="reports-header" style={{ marginBottom: '30px' }}>
        <div>
          <h1 className="reports-title">📊 Department Activity Report</h1>
          <p style={{ color: '#666', marginBottom: '10px' }}>
            View request approvals, rejections, and transfers for {departmentName}
          </p>
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
              Admin view - all departments
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="reports-filters" style={{ marginBottom: '30px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
            Start Date
          </label>
          <input 
            type="date" 
            name="startDate" 
            value={filters.startDate} 
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
            name="endDate" 
            value={filters.endDate} 
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
            onClick={() => {
              setFilters({ startDate: '', endDate: '' });
              setTimeout(fetchActivities, 100);
            }} 
            className="debug-button"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Activity List */}
      {loading ? (
        <div className="reports-loading">Loading activities...</div>
      ) : error ? (
        <div className="reports-error">
          ❌ {error}
          <br />
          <button 
            onClick={fetchActivities} 
            className="filter-button"
            style={{ marginTop: '15px' }}
          >
            Retry
          </button>
        </div>
      ) : activities.length === 0 ? (
        <div className="no-reports">
          <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📭</div>
          <p style={{ fontSize: '1.2rem', marginBottom: '10px' }}>No activities found</p>
          <p style={{ color: '#666' }}>Department request activities will appear here</p>
        </div>
      ) : (
        <div className="reports-table-container">
          {activities.map((activity, index) => (
            <div 
              key={index} 
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
                {getActivityIcon(activity.activity_type)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: '8px', lineHeight: '1.5' }}>
                  <strong style={{ color: '#FF7F00' }}>{activity.action_by}</strong>{' '}
                  {activity.activity_type?.toLowerCase() || 'performed action on'}{' '}
                  {activity.type} request from{' '}
                  <strong>{activity.requested_by}</strong>
                </div>
                <div style={{ 
                  display: 'flex', 
                  gap: '15px', 
                  fontSize: '0.85rem', 
                  color: '#666',
                  flexWrap: 'wrap',
                  alignItems: 'center'
                }}>
                  <span style={{ 
                    padding: '2px 8px',
                    background: '#f0f0f0',
                    borderRadius: '3px',
                    fontWeight: '500'
                  }}>
                    {activity.origin_department}
                  </span>
                  {activity.target_department && activity.origin_department !== activity.target_department && (
                    <>
                      <span>→</span>
                      <span style={{ 
                        padding: '2px 8px',
                        background: '#f0f0f0',
                        borderRadius: '3px',
                        fontWeight: '500'
                      }}>
                        {activity.target_department}
                      </span>
                    </>
                  )}
                  <span style={{ color: '#999' }}>
                    {formatDate(activity.date)}
                  </span>
                </div>
                {activity.notes && (
                  <div style={{ 
                    marginTop: '8px',
                    padding: '8px 12px',
                    background: '#f7fafc',
                    borderRadius: '4px',
                    fontSize: '0.9rem',
                    color: '#4a5568'
                  }}>
                    📝 {activity.notes}
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

export default DepartmentReports;