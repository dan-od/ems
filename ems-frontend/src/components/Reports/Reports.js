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

  // API base URL
  const API_BASE_URL = 'http://localhost:3001';

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async (filterParams = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get token from localStorage
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('You must be logged in to view reports');
      }
      
      const queryParams = new URLSearchParams(filterParams).toString();
      const url = filterParams.startDate || filterParams.endDate || filterParams.type
        ? `${API_BASE_URL}/api/reports/filter?${queryParams}`
        : `${API_BASE_URL}/api/reports`;
      
      console.log('Fetching reports from:', url);
      console.log('Using token:', token ? 'Token exists' : 'No token');
      
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
        const errorText = await response.text();
        console.error('Error response:', errorText);
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

  const handleDebug = () => {
    console.log('Token:', localStorage.getItem('token'));
    console.log('User Role:', localStorage.getItem('userRole'));
    console.log('User ID:', localStorage.getItem('userId'));
    console.log('User Name:', localStorage.getItem('userName'));
  };

  if (loading) return <div className="reports-loading">Loading...</div>;
  if (error) return <div className="reports-error">{error}</div>;

  return (
    <div className="reports-container">
      <h1 className="reports-title">Reports & Logs</h1>
      
      <div className="reports-actions">
        <button onClick={handleDebug} className="debug-button">Debug Info</button>
      </div>
      
      <form className="reports-filters" onSubmit={handleFilterSubmit}>
        <input 
          type="date" 
          name="startDate"
          className="date-filter"
          value={filters.startDate}
          onChange={handleFilterChange}
        />
        <input 
          type="date" 
          name="endDate"
          className="date-filter"
          value={filters.endDate}
          onChange={handleFilterChange}
        />
        <select 
          name="type"
          className="type-filter"
          value={filters.type}
          onChange={handleFilterChange}
        >
          <option value="">All Types</option>
          <option value="equipment">Equipment</option>
          <option value="maintenance">Maintenance</option>
          <option value="user">User Activity</option>
        </select>
        <button type="submit" className="filter-button">Apply Filters</button>
      </form>

      <div className="reports-table-container">
        {reports.length === 0 ? (
          <div className="no-reports">No reports found</div>
        ) : (
          <table className="reports-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th>User</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td>{new Date(report.date).toLocaleDateString()}</td>
                  <td>{report.type}</td>
                  <td>{report.description}</td>
                  <td>{report.user}</td>
                  <td>
                    <span className={`status-badge ${report.status.toLowerCase()}`}>
                      {report.status}
                    </span>
                  </td>
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