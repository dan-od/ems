// ems-frontend/src/components/JobPreparation/JobPreparationDetail.jsx
// =======================================================
// Job Preparation Detail View with Pre/Post Job Tabs
// =======================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { jobPreparationService } from '../../services/jobPreparation';
import PreJobInspection from './PreJobInspection';
import PostJobInspection from './PostJobInspection';
import './JobPreparation.css';

const JobPreparationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details'); // details, items, prejob, postjob
  const [message, setMessage] = useState('');
  
  const userRole = localStorage.getItem('userRole');
  const userId = parseInt(localStorage.getItem('userId'));

  useEffect(() => {
    fetchJobDetails();
  }, [id]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const { data } = await jobPreparationService.getById(id);
      setJob(data);
      
      // Auto-switch to appropriate tab based on status
      if (data.status === 'approved' || data.status === 'in_progress') {
        setActiveTab('prejob');
      } else if (data.status === 'post_job') {
        setActiveTab('postjob');
      }
    } catch (error) {
      console.error('Failed to fetch job details:', error);
      setMessage('❌ Failed to load job preparation');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (action) => {
    const review_notes = prompt(`Enter review notes for ${action}:`);
    if (!review_notes) return;

    try {
      await jobPreparationService.review(id, action, review_notes);
      setMessage(`✅ Job ${action}d successfully`);
      fetchJobDetails();
    } catch (error) {
      console.error('Review failed:', error);
      setMessage(`❌ Failed to ${action} job`);
    }
  };

  const handleStartJob = async () => {
    try {
      await jobPreparationService.update(id, { status: 'in_progress' });
      setMessage('✅ Job started');
      fetchJobDetails();
    } catch (error) {
      console.error('Start job failed:', error);
      setMessage('❌ Failed to start job');
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

  const getPriorityBadge = (priority) => {
    const colors = {
      low: 'gray',
      normal: 'blue',
      high: 'orange',
      critical: 'red'
    };
    
    return (
      <span className={`priority-badge priority-${colors[priority] || 'gray'}`}>
        {priority}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">⏳</div>
        <p>Loading job preparation...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="error-container">
        <h2>❌ Job Preparation Not Found</h2>
        <button onClick={() => navigate('/dashboard/job-preparation')} className="btn btn-primary">
          ← Back to List
        </button>
      </div>
    );
  }

  const canEdit = job.created_by === userId && job.status === 'draft';
  const canReview = userRole === 'manager' && job.status === 'pending_approval';
  const canInspect = (userRole === 'engineer' || userRole === 'staff' || userRole === 'manager') && 
                     (job.status === 'approved' || job.status === 'in_progress' || job.status === 'post_job');

  return (
    <div className="job-detail-container">
      {/* Header */}
      <div className="detail-header">
        <div className="header-left">
          <button 
            onClick={() => navigate('/dashboard/job-preparation')} 
            className="btn-back"
          >
            ← Back
          </button>
          <div>
            <h1>{job.job_name}</h1>
            <p className="job-number">{job.job_number}</p>
          </div>
        </div>
        
        <div className="header-right">
          {getStatusBadge(job.status)}
          
          {canEdit && (
            <button 
              onClick={() => navigate(`/dashboard/job-preparation/${id}/edit`)}
              className="btn btn-secondary"
            >
              ✏️ Edit
            </button>
          )}
          
          {canReview && (
            <>
              <button 
                onClick={() => handleReview('approve')}
                className="btn btn-success"
              >
                ✅ Approve
              </button>
              <button 
                onClick={() => handleReview('reject')}
                className="btn btn-danger"
              >
                ❌ Reject
              </button>
            </>
          )}

          {job.status === 'approved' && canInspect && (
            <button 
              onClick={handleStartJob}
              className="btn btn-primary"
            >
              🚀 Start Job
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          📄 Details
        </button>
        <button 
          className={`tab ${activeTab === 'items' ? 'active' : ''}`}
          onClick={() => setActiveTab('items')}
        >
          📦 Equipment ({job.items?.length || 0})
        </button>
        {(job.status === 'approved' || job.status === 'in_progress' || job.status === 'post_job' || job.status === 'completed') && (
          <button 
            className={`tab ${activeTab === 'prejob' ? 'active' : ''}`}
            onClick={() => setActiveTab('prejob')}
          >
            ✓ Pre-Job Inspection
          </button>
        )}
        {(job.status === 'in_progress' || job.status === 'post_job' || job.status === 'completed') && (
          <button 
            className={`tab ${activeTab === 'postjob' ? 'active' : ''}`}
            onClick={() => setActiveTab('postjob')}
          >
            📋 Post-Job Inspection
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* DETAILS TAB */}
        {activeTab === 'details' && (
          <div className="details-tab">
            <div className="detail-grid">
              <div className="detail-section">
                <h3>Job Information</h3>
                <div className="detail-row">
                  <span className="detail-label">Job Number:</span>
                  <span className="detail-value">{job.job_number}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Well Name:</span>
                  <span className="detail-value">{job.well_name || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Location:</span>
                  <span className="detail-value">{job.location || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Client:</span>
                  <span className="detail-value">{job.client_name || 'N/A'}</span>
                </div>
              </div>

              <div className="detail-section">
                <h3>Timeline</h3>
                <div className="detail-row">
                  <span className="detail-label">Planned Start:</span>
                  <span className="detail-value">
                    {job.planned_start_date ? new Date(job.planned_start_date).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Planned End:</span>
                  <span className="detail-value">
                    {job.planned_end_date ? new Date(job.planned_end_date).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                {job.actual_start_date && (
                  <div className="detail-row">
                    <span className="detail-label">Actual Start:</span>
                    <span className="detail-value">
                      {new Date(job.actual_start_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {job.actual_end_date && (
                  <div className="detail-row">
                    <span className="detail-label">Actual End:</span>
                    <span className="detail-value">
                      {new Date(job.actual_end_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="detail-section">
                <h3>Personnel</h3>
                <div className="detail-row">
                  <span className="detail-label">Created By:</span>
                  <span className="detail-value">{job.created_by_name}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Department:</span>
                  <span className="detail-value">{job.department_name}</span>
                </div>
                {job.reviewed_by_name && (
                  <>
                    <div className="detail-row">
                      <span className="detail-label">Reviewed By:</span>
                      <span className="detail-value">{job.reviewed_by_name}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Reviewed At:</span>
                      <span className="detail-value">
                        {new Date(job.reviewed_at).toLocaleString()}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {job.job_description && (
              <div className="detail-section full-width">
                <h3>Job Description</h3>
                <p className="detail-text">{job.job_description}</p>
              </div>
            )}

            {job.special_requirements && (
              <div className="detail-section full-width">
                <h3>Special Requirements</h3>
                <p className="detail-text">{job.special_requirements}</p>
              </div>
            )}

            {job.safety_considerations && (
              <div className="detail-section full-width">
                <h3>Safety Considerations</h3>
                <p className="detail-text alert-warning">{job.safety_considerations}</p>
              </div>
            )}

            {job.review_notes && (
              <div className="detail-section full-width">
                <h3>Review Notes</h3>
                <p className="detail-text">{job.review_notes}</p>
              </div>
            )}
          </div>
        )}

        {/* ITEMS TAB */}
        {activeTab === 'items' && (
          <div className="items-tab">
            <div className="items-header">
              <h3>Equipment & Tools</h3>
              <div className="items-summary">
                <span className="stat">Total: {job.items?.length || 0}</span>
                <span className="stat success">
                  Available: {job.items?.filter(i => i.item_status === 'available').length || 0}
                </span>
                <span className="stat warning">
                  Pending: {job.items?.filter(i => i.item_status === 'pending').length || 0}
                </span>
              </div>
            </div>

            {job.items && job.items.length > 0 ? (
              <div className="items-table">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Item Name</th>
                      <th>Description</th>
                      <th>Quantity</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {job.items.map((item, index) => (
                      <tr key={item.id}>
                        <td>{index + 1}</td>
                        <td>
                          <strong>{item.equipment_name || item.custom_item_name}</strong>
                        </td>
                        <td>{item.item_description || '-'}</td>
                        <td>
                          {item.quantity} {item.unit}
                        </td>
                        <td>{getPriorityBadge(item.priority)}</td>
                        <td>
                          <span className={`status-badge status-${item.item_status}`}>
                            {item.item_status}
                          </span>
                        </td>
                        <td>{item.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state-small">
                No equipment items added yet.
              </div>
            )}
          </div>
        )}

        {/* PRE-JOB INSPECTION TAB */}
        {activeTab === 'prejob' && (
          <PreJobInspection 
            jobId={id} 
            items={job.items} 
            onUpdate={fetchJobDetails}
          />
        )}

        {/* POST-JOB INSPECTION TAB */}
        {activeTab === 'postjob' && (
          <PostJobInspection 
            jobId={id} 
            items={job.items} 
            onUpdate={fetchJobDetails}
          />
        )}
      </div>
    </div>
  );
};

export default JobPreparationDetail;