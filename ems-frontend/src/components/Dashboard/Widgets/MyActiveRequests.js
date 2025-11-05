// ems-frontend/src/components/Dashboard/Widgets/MyActiveRequests.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Widgets.css';

const MyActiveRequests = ({ requests = [], loading }) => {
  const navigate = useNavigate();

  const getStatusBadge = (status) => {
    const statusMap = {
      'Pending': 'badge-yellow',
      'Approved': 'badge-green',
      'Rejected': 'badge-red',
      'Transferred': 'badge-blue',
      'Completed': 'badge-gray',
      'In Progress': 'badge-orange',
      'Awaiting_Dept_Approval': 'badge-purple'
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

  if (loading) {
    return (
      <div className="widget loading">
        <h3>📋 My Active Requests</h3>
        <div className="skeleton-loader">Loading...</div>
      </div>
    );
  }

  // Filter to remove any duplicates based on request ID
  const uniqueRequests = requests.filter((request, index, self) =>
    index === self.findIndex((r) => r.id === request.id)
  );

  // Only show non-completed requests for "active" view
  const activeRequests = uniqueRequests.filter(r => 
    r.status !== 'Completed' && r.status !== 'Rejected'
  );

  return (
    <div className="widget">
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
          <p>No active requests</p>
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/dashboard/requests')}
          >
            Create New Request
          </button>
        </div>
      ) : (
        <div className="request-list">
          {activeRequests.slice(0, 5).map(request => (
            <div key={`request-${request.id}`} className="request-card">
              <div className="request-header">
                <span className="request-id">#{request.id}</span>
                <span className={`badge ${getStatusBadge(request.status)}`}>
                  {request.status.replace('_', ' ')}
                </span>
              </div>
              <div className="request-body">
                <h4>{request.title || request.equipment_name || request.new_equipment_name || 'Request'}</h4>
                <p className="request-type">{request.request_type || request.type}</p>
                {request.department_name && (
                  <p className="request-dept">📍 {request.department_name}</p>
                )}
              </div>
              <div className="request-footer">
                <span className="priority">
                  {getPriorityIcon(request.priority)} {request.priority || 'Normal'}
                </span>
                <span className="date">
                  {new Date(request.created_at).toLocaleDateString()}
                </span>
              </div>
              <button 
                className="view-details-btn"
                onClick={() => navigate(`/dashboard/requests/view/${request.id}`)}
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