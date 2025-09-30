import React, { useState, useEffect } from 'react';
import './Reports.css';

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    type: ''
  });

  const userRole = localStorage.getItem('userRole');
  const API_BASE_URL = 'http://localhost:3001';

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async (filterParams = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('You must be logged in to view reports');
      }

      // Managers use department-activity endpoint, admins use regular reports
      const endpoint = (userRole === 'manager') 
        ? '/api/reports/department-activity'
        : '/api/reports/filter';
      
      const queryParams = new URLSearchParams(filterParams).toString();
      const url = queryParams 
        ? `${API_BASE_URL}${endpoint}?${queryParams}`
        : `${API_BASE_URL}${endpoint}`;
      
      console.log('Fetching reports from:', url);
      
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please log in to view reports');
        }
        throw new Error(`Failed to fetch reports: ${response.status}`);
      }

      const data = await response.json();
      console.log('Reports data:', data);
      setReports(data);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError(err.message || 'Error fetching reports');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchReports(filters);
  };

  const getActivityBadgeClass = (activityType) => {
    switch (activityType?.toLowerCase()) {
      case 'approval': return 'completed';
      case 'rejection': return 'failed';
      case 'transfer received': return 'pending';
      case 'transfer sent': return 'pending';
      default: return '';
    }
  };

  if (loading) return <div className="reports-loading">Loading...</div>;
  if (error) return <div className="reports-error">{error}</div>;

  return (
    <div className="reports-container">
      <h1 className="reports-title">
        {userRole === 'manager' ? 'Department Activity Log' : 'Reports & Logs'}
      </h1>
      
      <form className="reports-filters" onSubmit={handleFilterSubmit}>
        <input 
          type="date" 
          name="startDate"
          className="date-filter"
          value={filters.startDate}
          onChange={handleFilterChange}
          placeholder="Start Date"
        />
        <input 
          type="date" 
          name="endDate"
          className="date-filter"
          value={filters.endDate}
          onChange={handleFilterChange}
          placeholder="End Date"
        />
        {userRole === 'manager' && (
          <select 
            name="type"
            className="type-filter"
            value={filters.type}
            onChange={handleFilterChange}
          >
            <option value="">All Types</option>
            <option value="ppe">PPE</option>
            <option value="material">Material</option>
            <option value="equipment">Equipment</option>
            <option value="transport">Transport</option>
            <option value="maintenance">Maintenance</option>
          </select>
        )}
        <button type="submit" className="filter-button">Apply Filters</button>
      </form>

      <div className="reports-table-container">
        {reports.length === 0 ? (
          <div className="no-reports">No activity found</div>
        ) : (
          <table className="reports-table">
            <thead>
              <tr>
                <th>Date</th>
                {userRole === 'manager' && <th>Activity</th>}
                <th>Type</th>
                <th>Subject</th>
                <th>Requested By</th>
                <th>Action By</th>
                {userRole === 'manager' && <th>Origin/Target Dept</th>}
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report, index) => (
                <tr key={report.request_id || index}>
                  <td>{new Date(report.date).toLocaleDateString()}</td>
                  {userRole === 'manager' && (
                    <td>
                      <span className={`status-badge ${getActivityBadgeClass(report.activity_type)}`}>
                        {report.activity_type}
                      </span>
                    </td>
                  )}
                  <td>{report.type}</td>
                  <td>{report.subject}</td>
                  <td>{report.requested_by}</td>
                  <td>{report.action_by}</td>
                  {userRole === 'manager' && (
                    <td>
                      {report.activity_type?.includes('Transfer') && (
                        <small>
                          {report.origin_department} → {report.target_department}
                        </small>
                      )}
                    </td>
                  )}
                  <td><small>{report.notes || '—'}</small></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Reports;