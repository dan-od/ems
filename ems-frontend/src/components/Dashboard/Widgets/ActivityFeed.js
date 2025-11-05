
import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Widgets.css';

const MyActiveRequests = ({ requests = [], loading }) => {
  const navigate = useNavigate();

  // Filter to only show active (non-completed) requests
  const activeRequests = requests.filter(r => 
    r.status !== 'Completed' && r.status !== 'Rejected'
  );

  const getStatusBadge = (status) => {
    const statusMap = {
      'Pending': 'badge-yellow',
      'Approved': 'badge-green',
      'Rejected': 'badge-red',
      'Transferred': 'badge-blue',
      'Completed': 'badge-gray',
      'In Progress': 'badge-orange'
    };
    return statusMap[status] || 'badge-default';
  };

  const getPriorityIcon = (priority) => {
    const icons = {
      'Urgent': '🔴',
      'High': '🟠',
      'Medium': '🟡',
      'Low': '🟢'
    };
    return icons[priority] || '⚪';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="widget my-requests-widget">
        <div className="widget-header">
          <h3>📋 My Active Requests</h3>
        </div>
        <div className="skeleton-loader">
          <div className="skeleton-item"></div>
          <div className="skeleton-item"></div>
          <div className="skeleton-item"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="widget my-requests-widget">
      <div className="widget-header">
        <h3>📋 My Active Requests</h3>
        <button 
          className="view-all-btn"
          onClick={() => navigate('/dashboard/my-requests')}
        >
          View All →
        </button>
      </div>

      {activeRequests.length === 0 ? (
        <div className="empty-state">
          <p>✅ No active requests</p>
          <button 
            className="btn-create"
            onClick={() => navigate('/dashboard/requests')}
          >
            Create New Request
          </button>
        </div>
      ) : (
        <div className="request-cards-container">
          {activeRequests.slice(0, 5).map((request) => (
            <div key={request.id} className="request-card-item">
              <div className="request-card-header">
                <span className="request-id">#{request.id}</span>
                <span className={`badge ${getStatusBadge(request.status)}`}>
                  {request.status}
                </span>
              </div>
              
              <div className="request-card-content">
                <h4 className="request-title">
                  {request.subject || request.equipment_name || 'Request'}
                </h4>
                <p className="request-type">{request.request_type || 'General'}</p>
                
                <div className="request-meta">
                  <span className="meta-item">
                    📍 {request.department_name || 'Operations'}
                  </span>
                  <span className="meta-item">
                    {getPriorityIcon(request.priority)} {request.priority || 'Medium'}
                  </span>
                </div>
                
                <div className="request-date">
                  {formatDate(request.created_at)}
                </div>
              </div>
              
              <button 
                className="view-details-btn"
                onClick={() => navigate(`/dashboard/request/${request.id}`)}
              >
                View Details
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyActiveRequests;