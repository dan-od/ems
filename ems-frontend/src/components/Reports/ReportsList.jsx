// ems-frontend/src/components/Reports/FieldReports.js
// FIXED VERSION - Proper routing for Field Reports

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './Reports.css';

const FieldReports = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const userRole = localStorage.getItem('userRole');
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/field-reports');
      setReports(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch field reports:', error);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewReport = () => {
    // Use absolute path for navigation
    navigate('/dashboard/field-reports/new');
  };

  const handleViewReport = (reportId) => {
    // Use absolute path for navigation
    navigate(`/dashboard/field-reports/${reportId}`);
  };

  const handleEditReport = (reportId) => {
    // Use absolute path for navigation
    navigate(`/dashboard/field-reports/edit/${reportId}`);
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'Draft': 'badge-gray',
      'Submitted': 'badge-yellow',
      'Reviewed': 'badge-blue',
      'Approved': 'badge-green',
      'Rejected': 'badge-red'
    };
    return statusMap[status] || 'badge-default';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredReports = reports.filter(report => {
    // Apply status filter
    if (filter !== 'all' && report.status?.toLowerCase() !== filter) {
      return false;
    }
    
    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        report.title?.toLowerCase().includes(search) ||
        report.job_site?.toLowerCase().includes(search) ||
        report.submitted_by_name?.toLowerCase().includes(search) ||
        report.id?.toString().includes(search)
      );
    }
    
    return true;
  });

  if (loading) {
    return (
      <div className="reports-container">
        <div className="loading">Loading field reports...</div>
      </div>
    );
  }

  return (
    <div className="reports-container">
      {/* Header */}
      <div className="reports-header">
        <div>
          <h1>Field Reports</h1>
          <p className="subtitle">Job site reports and documentation</p>
        </div>
        <button 
          className="btn-primary"
          onClick={handleNewReport}
        >
          + New Report
        </button>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-tabs">
          <button 
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            All ({reports.length})
          </button>
          <button 
            className={filter === 'submitted' ? 'active' : ''}
            onClick={() => setFilter('submitted')}
          >
            Submitted ({reports.filter(r => r.status === 'Submitted').length})
          </button>
          <button 
            className={filter === 'approved' ? 'active' : ''}
            onClick={() => setFilter('approved')}
          >
            Approved ({reports.filter(r => r.status === 'Approved').length})
          </button>
          <button 
            className={filter === 'draft' ? 'active' : ''}
            onClick={() => setFilter('draft')}
          >
            Drafts ({reports.filter(r => r.status === 'Draft').length})
          </button>
        </div>
        
        <div className="search-box">
          <input
            type="text"
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Reports List/Table */}
      {filteredReports.length === 0 ? (
        <div className="empty-state">
          <h3>No field reports found</h3>
          <p>
            {filter !== 'all' 
              ? `No ${filter} reports available.` 
              : 'Start by creating your first field report.'}
          </p>
          <button 
            className="btn-primary"
            onClick={handleNewReport}
          >
            Create Field Report
          </button>
        </div>
      ) : (
        <div className="reports-table-wrapper">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Report ID</th>
                <th>Title</th>
                <th>Job Site</th>
                <th>Date</th>
                <th>Submitted By</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map(report => (
                <tr key={report.id}>
                  <td>#{report.id}</td>
                  <td className="report-title">
                    {report.title || 'Untitled Report'}
                  </td>
                  <td>{report.job_site || 'N/A'}</td>
                  <td>{formatDate(report.report_date || report.created_at)}</td>
                  <td>{report.submitted_by_name || 'Unknown'}</td>
                  <td>
                    <span className={`badge ${getStatusBadge(report.status)}`}>
                      {report.status || 'Draft'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-view"
                        onClick={() => handleViewReport(report.id)}
                      >
                        View
                      </button>
                      {(report.status === 'Draft' && report.submitted_by === userId) && (
                        <button
                          className="btn-edit"
                          onClick={() => handleEditReport(report.id)}
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default FieldReports;