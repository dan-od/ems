// ems-frontend/src/components/Reports/FieldReports.js
// UPDATED - Request Hub style header card

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
    navigate('/dashboard/field-reports/new');
  };

  const handleViewReport = (reportId) => {
    navigate(`/dashboard/field-reports/${reportId}`);
  };

  const handleEditReport = (reportId) => {
    navigate(`/dashboard/field-reports/edit/${reportId}`);
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'Draft': 'status-draft',
      'Submitted': 'status-submitted',
      'Reviewed': 'status-reviewed',
      'Approved': 'status-approved',
      'Rejected': 'status-rejected'
    };
    return statusMap[status] || 'status-default';
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
    if (filter !== 'all' && report.status?.toLowerCase() !== filter) {
      return false;
    }
    
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
      {/* ✅ Request Hub Style Header Card */}
      <div className="page-header-card">
        <div className="header-content">
          <h1 className="page-title">Field Reports</h1>
          <p className="page-subtitle">
            Job site reports, documentation, and field engineer submissions
          </p>
        </div>
        <button 
          className="btn-add-new"
          onClick={handleNewReport}
        >
          + New Report
        </button>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({reports.length})
          </button>
          <button 
            className={`filter-tab ${filter === 'submitted' ? 'active' : ''}`}
            onClick={() => setFilter('submitted')}
          >
            Submitted ({reports.filter(r => r.status === 'Submitted').length})
          </button>
          <button 
            className={`filter-tab ${filter === 'approved' ? 'active' : ''}`}
            onClick={() => setFilter('approved')}
          >
            Approved ({reports.filter(r => r.status === 'Approved').length})
          </button>
          <button 
            className={`filter-tab ${filter === 'draft' ? 'active' : ''}`}
            onClick={() => setFilter('draft')}
          >
            Drafts ({reports.filter(r => r.status === 'Draft').length})
          </button>
        </div>
        
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Reports Table */}
      {filteredReports.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
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
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>TITLE</th>
                <th>JOB SITE</th>
                <th>DATE</th>
                <th>SUBMITTED BY</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map(report => (
                <tr key={report.id}>
                  <td className="report-id">#{report.id}</td>
                  <td className="report-title">
                    {report.title || 'Untitled Report'}
                  </td>
                  <td>{report.job_site || 'N/A'}</td>
                  <td>{formatDate(report.report_date || report.created_at)}</td>
                  <td>{report.submitted_by_name || 'Unknown'}</td>
                  <td>
                    <span className={`status-badge ${getStatusBadge(report.status)}`}>
                      {report.status || 'Draft'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-action btn-view"
                        onClick={() => handleViewReport(report.id)}
                      >
                        View
                      </button>
                      {(report.status === 'Draft' && report.submitted_by === userId) && (
                        <button
                          className="btn-action btn-edit"
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