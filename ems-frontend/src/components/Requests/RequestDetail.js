
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './RequestDetail.css';

const RequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionMessage, setActionMessage] = useState('');

  const userRole = localStorage.getItem('userRole');
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    fetchRequestDetails();
  }, [id]);

  const fetchRequestDetails = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/requests/${id}`);
      setRequest(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching request:', err);
      setError(err.response?.data?.error || 'Failed to fetch request details');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus, notes = '') => {
    try {
      await api.patch(`/requests/${id}`, { 
        status: newStatus,
        notes: notes 
      });
      setActionMessage(`✅ Request ${newStatus.toLowerCase()} successfully!`);
      fetchRequestDetails(); // Refresh data
      setTimeout(() => setActionMessage(''), 3000);
    } catch (err) {
      setActionMessage(`❌ Failed to update request: ${err.response?.data?.error || err.message}`);
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      'Pending': 'badge-yellow',
      'Approved': 'badge-green',
      'Rejected': 'badge-red',
      'Completed': 'badge-blue',
      'Transferred': 'badge-purple',
      'In Progress': 'badge-orange'
    };
    return statusColors[status] || 'badge-gray';
  };

  const getPriorityBadge = (priority) => {
    const priorityColors = {
      'Urgent': 'badge-urgent',
      'High': 'badge-high',
      'Medium': 'badge-medium',
      'Low': 'badge-low'
    };
    return priorityColors[priority] || 'badge-medium';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="request-detail-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading request details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="request-detail-container">
        <div className="error-message">
          <h2>❌ Error</h2>
          <p>{error}</p>
          <button 
            className="btn-primary"
            onClick={() => navigate('/dashboard/my-requests')}
          >
            Back to Requests
          </button>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="request-detail-container">
        <div className="error-message">
          <h2>Request Not Found</h2>
          <button 
            className="btn-primary"
            onClick={() => navigate('/dashboard/my-requests')}
          >
            Back to Requests
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="request-detail-container">
      {/* Header */}
      <div className="detail-header">
        <h1>Request Details</h1>
        <button 
          className="back-button"
          onClick={() => navigate('/dashboard/my-requests')}
        >
          ← Back to Requests
        </button>
      </div>

      {/* Action Message */}
      {actionMessage && (
        <div className={`action-message ${actionMessage.includes('✅') ? 'success' : 'error'}`}>
          {actionMessage}
        </div>
      )}

      {/* Main Content Card */}
      <div className="detail-card">
        {/* Request Information Section */}
        <div className="detail-section">
          <h2>Request Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Request ID:</label>
              <span className="info-value">#{request.id}</span>
            </div>
            <div className="info-item">
              <label>Type:</label>
              <span className="info-value capitalize">
                {request.request_type || 'General'}
              </span>
            </div>
            <div className="info-item">
              <label>Equipment:</label>
              <span className="info-value">
                {request.equipment_name || request.new_equipment_name || 'N/A'}
              </span>
            </div>
            <div className="info-item">
              <label>Department:</label>
              <span className="info-value">
                {request.department_name || 'Not Assigned'}
              </span>
            </div>
            <div className="info-item">
              <label>Requested By:</label>
              <span className="info-value">
                {request.requested_by_name || 'Unknown'}
              </span>
            </div>
            <div className="info-item">
              <label>Status:</label>
              <span className={`badge ${getStatusBadge(request.status)}`}>
                {request.status}
              </span>
            </div>
            <div className="info-item">
              <label>Priority:</label>
              <span className={`badge ${getPriorityBadge(request.priority)}`}>
                {request.priority || 'Medium'}
              </span>
            </div>
            <div className="info-item">
              <label>Created:</label>
              <span className="info-value">
                {formatDate(request.created_at)}
              </span>
            </div>
            {request.approved_by_name && (
              <div className="info-item">
                <label>Approved By:</label>
                <span className="info-value">
                  {request.approved_by_name}
                </span>
              </div>
            )}
            {request.approved_at && (
              <div className="info-item">
                <label>Approved At:</label>
                <span className="info-value">
                  {formatDate(request.approved_at)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Subject & Description Section */}
        <div className="detail-section">
          <h2>Subject</h2>
          <div className="content-box">
            <p className="subject-text">
              {request.subject || 'No subject provided'}
            </p>
          </div>
        </div>

        <div className="detail-section">
          <h2>Description</h2>
          <div className="content-box">
            <p className="description-text">
              {request.description || 'No description provided'}
            </p>
          </div>
        </div>

        {/* Transfer Information (if transferred) */}
        {request.transferred_to && (
          <div className="detail-section">
            <h2>Transfer Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <label>Transferred To:</label>
                <span className="info-value">
                  {request.transferred_to_department_name || 'Department'}
                </span>
              </div>
              <div className="info-item">
                <label>Transfer Date:</label>
                <span className="info-value">
                  {formatDate(request.transferred_at)}
                </span>
              </div>
              {request.transfer_notes && (
                <div className="info-item full-width">
                  <label>Transfer Notes:</label>
                  <span className="info-value">
                    {request.transfer_notes}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons (for managers/admin) */}
        {(userRole === 'manager' || userRole === 'admin') && request.status === 'Pending' && (
          <div className="detail-section">
            <h2>Actions</h2>
            <div className="action-buttons">
              <button 
                className="btn-approve"
                onClick={() => handleStatusChange('Approved')}
              >
                ✅ Approve
              </button>
              <button 
                className="btn-reject"
                onClick={() => {
                  const reason = prompt('Reason for rejection:');
                  if (reason) handleStatusChange('Rejected', reason);
                }}
              >
                ❌ Reject
              </button>
              <button 
                className="btn-transfer"
                onClick={() => {
                  // You can implement a modal here for department selection
                  alert('Transfer functionality to be implemented');
                }}
              >
                🔄 Transfer
              </button>
            </div>
          </div>
        )}

        {/* Complete Button (for approved requests) */}
        {request.status === 'Approved' && (userRole === 'manager' || userRole === 'admin') && (
          <div className="detail-section">
            <div className="action-buttons">
              <button 
                className="btn-complete"
                onClick={() => handleStatusChange('Completed')}
              >
                ✔️ Mark as Completed
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Activity History (optional) */}
      <div className="detail-card">
        <h2>Activity History</h2>
        <div className="activity-timeline">
          <div className="timeline-item">
            <div className="timeline-marker"></div>
            <div className="timeline-content">
              <strong>Request Created</strong>
              <p>by {request.requested_by_name}</p>
              <small>{formatDate(request.created_at)}</small>
            </div>
          </div>
          {request.approved_at && (
            <div className="timeline-item">
              <div className="timeline-marker approved"></div>
              <div className="timeline-content">
                <strong>Request {request.status}</strong>
                <p>by {request.approved_by_name}</p>
                <small>{formatDate(request.approved_at)}</small>
              </div>
            </div>
          )}
          {request.completed_at && (
            <div className="timeline-item">
              <div className="timeline-marker completed"></div>
              <div className="timeline-content">
                <strong>Request Completed</strong>
                <small>{formatDate(request.completed_at)}</small>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestDetail;