import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './Reports.css';

const ReportDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const userRole = localStorage.getItem('userRole');

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/field-reports/${id}`);
      setReport(data);
    } catch (err) {
      console.error('Failed to fetch report:', err);
      setError('Failed to load report details');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await api.get(`/field-reports/download/${id}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', report.attachment_filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download report');
    }
  };

  const handleReview = async (status, notes) => {
    try {
      await api.patch(`/field-reports/${id}/review`, { status, review_notes: notes });
      alert('Report reviewed successfully');
      fetchReport(); // Refresh
    } catch (error) {
      console.error('Review failed:', error);
      alert('Failed to review report');
    }
  };

  if (loading) return <div className="loading">Loading report...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!report) return <div className="error-message">Report not found</div>;

  return (
    <div className="report-detail-container">
      <div className="report-detail-header">
        <button className="btn-back" onClick={() => navigate('/dashboard/field-reports')}>
          ← Back to Reports
        </button>
        <h1>Field Report Details</h1>
      </div>

      <div className="report-detail-card">
        {/* Status Badge */}
        <div className="report-status-section">
          <span className={`status-badge status-${report.status.toLowerCase()}`}>
            {report.status}
          </span>
        </div>

        {/* Basic Info */}
        <section className="detail-section">
          <h2>Basic Information</h2>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Report Date:</label>
              <span>{new Date(report.report_date).toLocaleDateString()}</span>
            </div>
            <div className="detail-item">
              <label>Submitted By:</label>
              <span>{report.submitted_by_name}</span>
            </div>
            <div className="detail-item">
              <label>Department:</label>
              <span>{report.department_name}</span>
            </div>
            <div className="detail-item">
              <label>Submitted On:</label>
              <span>{new Date(report.created_at).toLocaleString()}</span>
            </div>
          </div>
        </section>

        {/* Job Details */}
        <section className="detail-section">
          <h2>Job Details</h2>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Job Title:</label>
              <span>{report.job_title}</span>
            </div>
            <div className="detail-item">
              <label>Job Type:</label>
              <span>{report.job_type || '—'}</span>
            </div>
            <div className="detail-item">
              <label>Location:</label>
              <span>{report.job_location || '—'}</span>
            </div>
            <div className="detail-item">
              <label>Client:</label>
              <span>{report.client_name || '—'}</span>
            </div>
          </div>

          {report.job_description && (
            <div className="detail-item full-width">
              <label>Notes:</label>
              <p>{report.job_description}</p>
            </div>
          )}
        </section>

        {/* Attached File */}
        {report.attachment_filename && (
          <section className="detail-section">
            <h2>Attached Document</h2>
            <div className="file-info">
              <span className="file-icon">📄</span>
              <div>
                <strong>{report.attachment_filename}</strong>
                <p>Uploaded: {new Date(report.created_at).toLocaleString()}</p>
              </div>
              <button className="btn-primary" onClick={handleDownload}>
                Download Report
              </button>
            </div>
          </section>
        )}

        {/* Review Section for Managers/Admins */}
        {(userRole === 'manager' || userRole === 'admin') && report.status === 'Submitted' && (
          <section className="detail-section review-section">
            <h2>Review Report</h2>
            <div className="review-actions">
              <button 
                className="btn-approve"
                onClick={() => {
                  const notes = prompt('Add review notes (optional):');
                  handleReview('Reviewed', notes);
                }}
              >
                Mark as Reviewed
              </button>
              <button 
                className="btn-success"
                onClick={() => {
                  const notes = prompt('Add approval notes (optional):');
                  handleReview('Approved', notes);
                }}
              >
                Approve Report
              </button>
            </div>
          </section>
        )}

        {/* Review History */}
        {report.reviewed_by_name && (
          <section className="detail-section">
            <h2>Review History</h2>
            <div className="review-history">
              <p><strong>Reviewed by:</strong> {report.reviewed_by_name}</p>
              <p><strong>Reviewed on:</strong> {new Date(report.reviewed_at).toLocaleString()}</p>
              {report.review_notes && (
                <p><strong>Notes:</strong> {report.review_notes}</p>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ReportDetail;