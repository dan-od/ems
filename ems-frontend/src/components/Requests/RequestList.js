import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestService } from '../../services/api';
import './Requests.css';

const RequestList = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyRequests();
  }, []);

  const fetchMyRequests = async () => {
    try {
      setLoading(true);
      const { data } = await requestService.getMyRequests();
      setRequests(data);
    } catch (err) {
      console.error('Failed to fetch requests:', err);
      setError('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityClass = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return 'priority-urgent';
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      case 'low': return 'priority-low';
      default: return 'priority-default';
    }
  };

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'status-pending';
      case 'approved': return 'status-approved';
      case 'rejected': return 'status-rejected';
      case 'transferred': return 'status-transferred';
      case 'in-progress': return 'status-in-progress';
      default: return 'status-default';
    }
  };

  if (loading) return <div className="loading">Loading your requests...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="requests-container">
      <div className="requests-header">
        <h1>My Requests</h1>
        <button 
          className="new-request-btn"
          onClick={() => navigate('/dashboard/requests')}
        >
          New Request
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="no-requests">
          <p>You haven't made any requests yet.</p>
          <button 
            onClick={() => navigate('/dashboard/requests')}
            className="new-request-btn"
          >
            Make Your First Request
          </button>
        </div>
      ) : (
        <>
          {/* Desktop: Table View */}
          <div className="requests-table-desktop">
            <table className="requests-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Subject</th>
                  <th>Type</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td>#{request.id}</td>
                    <td>{request.subject}</td>
                    <td>{request.request_type}</td>
                    <td>
                      <span className={getPriorityClass(request.priority)}>
                        {request.priority}
                      </span>
                    </td>
                    <td>
                      <span className={getStatusClass(request.status)}>
                        {request.status}
                      </span>
                    </td>
                    <td>{new Date(request.created_at).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="view-btn"
                        onClick={() => navigate(`/dashboard/requests/${request.id}`)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: Card View */}
          <div className="requests-cards-mobile">
            {requests.map((request) => (
              <div key={request.id} className="request-card">
                <div className="request-card-header">
                  <div className="request-id">#{request.id}</div>
                  <span className={getStatusClass(request.status)}>
                    {request.status}
                  </span>
                </div>

                <div className="request-card-body">
                  <h3 className="request-subject">{request.subject}</h3>
                  <div className="request-meta">
                    <span className="request-type-badge">{request.request_type}</span>
                    <span className={getPriorityClass(request.priority)}>
                      {request.priority}
                    </span>
                  </div>
                  <div className="request-date">
                    {new Date(request.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="request-card-actions">
                  <button
                    className="view-details-btn"
                    onClick={() => navigate(`/dashboard/requests/${request.id}`)}
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

export default RequestList;