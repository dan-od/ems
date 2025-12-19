import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { jobPreparationService } from '../../services/jobPreparation';
import './JobPreparation.css';

const JobPreparationHub = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const userRole = localStorage.getItem('userRole');

  useEffect(() => {
    fetchJobs();
  }, [filter]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
      const { data } = await jobPreparationService.getAll(params);
      setJobs(data);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { color: 'gray', label: 'Draft', icon: '📝' },
      pending_approval: { color: 'yellow', label: 'Pending Approval', icon: '⏳' },
      approved: { color: 'green', label: 'Approved', icon: '✅' },
      in_progress: { color: 'blue', label: 'In Progress', icon: '🔄' },
      post_job: { color: 'orange', label: 'Post-Job', icon: '📋' },
      completed: { color: 'green', label: 'Completed', icon: '✓' },
      cancelled: { color: 'red', label: 'Cancelled', icon: '✗' }
    };

    const config = statusConfig[status] || { color: 'gray', label: status, icon: '❓' };
    
    return (
      <span className={`status-badge status-${config.color}`}>
        {config.icon} {config.label}
      </span>
    );
  };

  if (loading) {
    return <div className="loading">Loading job preparations...</div>;
  }

  return (
    <div className="job-prep-hub">
      {/* Header Card */}
      <div className="hub-header-card">
        <div className="hub-header-content">
          <div className="hub-title-section">
            <h1>📋 Job Preparation</h1>
            <p className="hub-subtitle">
              Manage pre-job and post-job equipment checklists
            </p>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/dashboard/job-preparation/new')}
          >
            <span className="btn-icon">+</span>
            New Job Preparation
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="filter-tabs">
          {['all', 'draft', 'pending_approval', 'approved', 'in_progress', 'post_job', 'completed'].map(status => (
            <button
              key={status}
              className={`filter-tab ${filter === status ? 'active' : ''}`}
              onClick={() => setFilter(status)}
            >
              {status.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Job List */}
      <div className="job-list">
        {jobs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>No Job Preparations Found</h3>
            <p>Create your first job preparation to get started</p>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/dashboard/job-preparation/new')}
            >
              Create Job Preparation
            </button>
          </div>
        ) : (
          <div className="job-grid">
            {jobs.map(job => (
              <div 
                key={job.id} 
                className="job-card"
                onClick={() => navigate(`/dashboard/job-preparation/${job.id}`)}
              >
                <div className="job-card-header">
                  <div>
                    <h3>{job.job_name}</h3>
                    <p className="job-number">{job.job_number}</p>
                  </div>
                  {getStatusBadge(job.status)}
                </div>

                <div className="job-card-body">
                  {job.well_name && (
                    <div className="job-info-row">
                      <span className="info-label">Well:</span>
                      <span className="info-value">{job.well_name}</span>
                    </div>
                  )}
                  {job.location && (
                    <div className="job-info-row">
                      <span className="info-label">Location:</span>
                      <span className="info-value">{job.location}</span>
                    </div>
                  )}
                  {job.client_name && (
                    <div className="job-info-row">
                      <span className="info-label">Client:</span>
                      <span className="info-value">{job.client_name}</span>
                    </div>
                  )}
                  {job.planned_start_date && (
                    <div className="job-info-row">
                      <span className="info-label">Start Date:</span>
                      <span className="info-value">
                        {new Date(job.planned_start_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="job-card-footer">
                  <div className="job-stats">
                    <span className="stat">
                      <strong>{job.total_items || 0}</strong> items
                    </span>
                    <span className="stat">
                      <strong>{job.available_items || 0}</strong> ready
                    </span>
                  </div>
                  <div className="job-meta">
                    Created by {job.created_by_name}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobPreparationHub;