import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './Reports.css';

const ReportsList = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const userRole = localStorage.getItem('userRole');

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const endpoint = userRole === 'manager' || userRole === 'admin' 
        ? '/field-reports/department'
        : '/field-reports/my-reports';
      
      const { data } = await api.get(endpoint);
      setReports(data);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (reportId, filename) => {
    try {
      const response = await api.get(`/field-reports/download/${reportId}`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download report');
    }
  };

  const getStatusBadge = (status) => {
    const classes = {
      'Submitted': 'status-submitted',
      'Reviewed': 'status-reviewed',
      'Approved': 'status-approved'
    };
    return classes[status] || 'status-submitted';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return <div className="loading">Loading reports...</div>;
  }

  return (
    <div className="reports-list-container">
      <div className="reports-header">
        <h1>Field Reports</h1>
        {(userRole === 'engineer' || userRole === 'admin') && (
          <button
            className="btn-primary"
            onClick={() => navigate('/dashboard/submit-report')}
          >
            + Submit New Report
          </button>
        )}
      </div>

      {reports.length === 0 ? (
        <div className="empty-state">
          <p>No reports found</p>
          {(userRole === 'engineer' || userRole === 'admin') && (
            <button
              className="btn-primary"
              onClick={() => navigate('/dashboard/submit-report')}
            >
              Submit Your First Report
            </button>
          )}
        </div>
      ) : (
        <div className="reports-table-container">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Job Title</th>
                <th>Location</th>
                <th>Type</th>
                {(userRole === 'manager' || userRole === 'admin') && (
                  <th>Submitted By</th>
                )}
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td>{formatDate(report.report_date)}</td>
                  <td>{report.job_title}</td>
                  <td>{report.job_location || '—'}</td>
                  <td>{report.job_type || '—'}</td>
                  {(userRole === 'manager' || userRole === 'admin') && (
                    <td>{report.submitted_by_name}</td>
                  )}
                  <td>
                    <span className={`status-badge ${getStatusBadge(report.status)}`}>
                      {report.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {report.attachment_filename && (
                        <button
                          className="btn-sm btn-download"
                          onClick={() => handleDownload(report.id, report.attachment_filename)}
                        >
                          Download
                        </button>
                      )}
                      <button
                        className="btn-sm btn-view"
                        onClick={() => navigate(`/dashboard/report/${report.id}`)}
                      >
                        View
                      </button>
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

export default ReportsList;