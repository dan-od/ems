// src/components/Requests/RecentRequests.js - CORRECTED
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Requests.css'; // ✅ Use the correct CSS file

const RecentRequests = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRecentRequests();
  }, []);

  const fetchRecentRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get('http://localhost:3001/api/requests/my-requests', {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem('token')}` 
        }
      });
      
      // Sort by date, most recent first
      const sortedRequests = response.data.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
      
      setRequests(sortedRequests);
    } catch (err) {
      console.error('Failed to fetch recent requests:', err);
      setError('Failed to load recent requests');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityBadgeClass = (priority) => {
    const priorityLower = (priority || 'medium').toLowerCase();
    return `priority-${priorityLower}`;
  };

  const getStatusBadgeClass = (status) => {
    const statusLower = (status || 'pending').toLowerCase().replace(/\s+/g, '-');
    return `status-${statusLower}`;
  };

  if (loading) {
    return (
      <div className="requests-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading your requests...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="requests-container">
        <div className="error-message">
          <span>⚠️</span>
          <p>{error}</p>
          <button onClick={fetchRecentRequests} className="btn-retry">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="requests-container">
      <div className="requests-header">
        <h1>My Recent Requests</h1>
        <button 
          className="btn-primary"
          onClick={() => navigate('/dashboard/requests')}
        >
          + New Request
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="no-requests">
          <p>📋 No requests found</p>
          <p className="text-secondary">Create your first request to get started</p>
          <button 
            className="btn-primary"
            onClick={() => navigate('/dashboard/requests')}
          >
            Create Request
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="requests-table-desktop">
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
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <span className="request-type-badge">
                        {request.request_type || 'General'}
                      </span>
                    </td>
                    <td className="request-subject">{request.subject}</td>
                    <td>{request.department_name || '—'}</td>
                    <td>
                      <span className={getPriorityBadgeClass(request.priority)}>
                        {request.priority || 'Medium'}
                      </span>
                    </td>
                    <td>
                      <span className={getStatusBadgeClass(request.status)}>
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

          {/* Mobile Card View */}
          <div className="requests-grid-mobile">
            {requests.map((request) => (
              <div key={request.id} className="request-card">
                <div className="request-card-header">
                  <span className="request-type-badge">
                    {request.request_type || 'General'}
                  </span>
                  <span className={getStatusBadgeClass(request.status)}>
                    {request.status || 'Pending'}
                  </span>
                </div>
                
                <div className="request-card-body">
                  <h3 className="request-subject">{request.subject}</h3>
                  <div className="request-meta">
                    <span className="request-department">
                      {request.department_name || '—'}
                    </span>
                    <span className={getPriorityBadgeClass(request.priority)}>
                      {request.priority || 'Medium'}
                    </span>
                  </div>
                  <div className="request-date">
                    {new Date(request.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="request-card-actions">
                  <button
                    className="view-details-btn"
                    onClick={() => navigate(`/dashboard/request/${request.id}`)}
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default RecentRequests;