import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Widgets.css';

const MyActiveRequests = ({ requests, loading }) => {
  const navigate = useNavigate();

  const getPriorityColor = (priority) => {
    const p = (priority || '').toLowerCase();
    switch (p) {
      case 'urgent': return 'priority-urgent';
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      case 'low': return 'priority-low';
      default: return 'priority-medium';
    }
  };

  const getStatusColor = (status) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'approved': return 'status-approved';
      case 'pending': return 'status-pending';
      case 'transferred': return 'status-transferred';
      case 'rejected': return 'status-rejected';
      case 'completed': return 'status-completed';
      default: return 'status-pending';
    }
  };

  const getTimeAgo = (dateString) => {
    const now = new Date();
    const created = new Date(dateString);
    const hours = Math.floor((now - created) / (1000 * 60 * 60));
    
    if (hours < 1) return 'Less than 1 hour ago';
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    
    const days = Math.floor(hours / 24);
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  };

  if (loading) {
    return (
      <div className="widget loading">
        <h3>📋 My Active Requests</h3>
        <p>Loading requests...</p>
      </div>
    );
  }

  // Filter to only active requests
  const activeRequests = requests.filter(r => 
    !['Completed', 'Rejected'].includes(r.status)
  );

  return (
    <div className="widget my-requests-widget">
      <div className="widget-header">
        <h3>📋 My Active Requests ({activeRequests.length})</h3>
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
            className="btn-primary"
            onClick={() => navigate('/dashboard/requests')}
          >
            Create New Request
          </button>
        </div>
      ) : (
        <div className="requests-list">
          {activeRequests.slice(0, 5).map((request) => (
            <div 
              key={request.id} 
              className="request-card"
              onClick={() => navigate(`/dashboard/request/${request.id}`)}
            >
              <div className="request-header">
                <span className={`priority-badge ${getPriorityColor(request.priority)}`}>
                  {request.priority === 'Urgent' ? '🔴' : request.priority === 'High' ? '🟡' : '🟢'} 
                  {request.priority || 'MEDIUM'}
                </span>
                <span className={`status-badge ${getStatusColor(request.status)}`}>
                  {request.status || 'Pending'}
                </span>
              </div>
              
              <h4 className="request-title">{request.subject || 'Equipment Request'}</h4>
              
              <p className="request-description">
                {request.description || request.equipment_name || 'No description'}
              </p>
              
              <div className="request-footer">
                <span className="request-time">{getTimeAgo(request.created_at)}</span>
                {request.transferred_to_department_name && (
                  <span className="transfer-info">
                    → {request.transferred_to_department_name}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyActiveRequests;