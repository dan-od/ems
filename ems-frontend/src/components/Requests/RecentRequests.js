import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './Requests.css';

const RecentRequests = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/requests/my-requests');
      
      // Ensure unique requests
      const uniqueRequests = Array.isArray(data) 
        ? data.filter((request, index, self) =>
            index === self.findIndex((r) => r.id === request.id)
          )
        : [];
      
      setRequests(uniqueRequests);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    const statusClasses = {
      'Pending': 'status-pending',
      'Approved': 'status-approved', 
      'Rejected': 'status-rejected',
      'Completed': 'status-completed',
      'Transferred': 'status-transferred'
    };
    return statusClasses[status] || 'status-default';
  };

  const getPriorityBadgeClass = (priority) => {
    const priorityClasses = {
      'Urgent': 'priority-urgent',
      'High': 'priority-high',
      'Medium': 'priority-medium',
      'Low': 'priority-low'
    };
    return priorityClasses[priority] || 'priority-default';
  };

  const filteredRequests = filter === 'all' 
    ? requests 
    : requests.filter(r => r.status?.toLowerCase() === filter);

  if (loading) {
    return (
      <div className="requests-container">
        <div className="loading">Loading your requests...</div>
      </div>
    );
  }

  return (
    <div className="requests-container">
      {/* Header */}
      <div className="requests-header">
        <h1>My Requests</h1>
        <button 
          className="new-request-btn"
          onClick={() => navigate('/dashboard/requests')}
        >
          + New Request
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button 
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All ({requests.length})
        </button>
        <button 
          className={filter === 'pending' ? 'active' : ''}
          onClick={() => setFilter('pending')}
        >
          Pending ({requests.filter(r => r.status === 'Pending').length})
        </button>
        <button 
          className={filter === 'approved' ? 'active' : ''}
          onClick={() => setFilter('approved')}
        >
          Approved ({requests.filter(r => r.status === 'Approved').length})
        </button>
        <button 
          className={filter === 'completed' ? 'active' : ''}
          onClick={() => setFilter('completed')}
        >
          Completed ({requests.filter(r => r.status === 'Completed').length})
        </button>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="no-requests">
          <p>📋 No requests found</p>
          <p className="text-secondary">
            {filter !== 'all' 
              ? `You have no ${filter} requests.`
              : 'Create your first request to get started'}
          </p>
          <button 
            className="btn-primary"
            onClick={() => navigate('/dashboard/requests')}
          >
            Create Request
          </button>
        </div>
      ) : (
        /* SINGLE TABLE VIEW - No duplicate card view */
        <div className="requests-table-wrapper">
          <table className="requests-table">
            <thead>
              <tr>
                <th>Request Type</th>
                <th>Subject</th>
                <th>Department</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((request) => (
                <tr key={`req-${request.id}`}>
                  <td>
                    <span className="request-type-badge">
                      {request.request_type || 'General'}
                    </span>
                  </td>
                  <td className="request-subject">
                    {request.subject || request.description || 'Untitled'}
                  </td>
                  <td>{request.department_name || '—'}</td>
                  <td>
                    <span className={`badge ${getPriorityBadgeClass(request.priority)}`}>
                      {request.priority || 'Medium'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadgeClass(request.status)}`}>
                      {request.status || 'Pending'}
                    </span>
                  </td>
                  <td>{new Date(request.created_at).toLocaleDateString()}</td>
                  <td>
                    <button
                      onClick={() => navigate(`/dashboard/request/${request.id}`)}
                      className="view-btn"
                    >
                      View
                    </button>
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

export default RecentRequests;