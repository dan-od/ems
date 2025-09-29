// src/components/Requests/RequestList.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
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
      const { data } = await api.get('/requests/my-requests');
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
      case 'urgent': return 'priority-badge urgent';
      case 'high': return 'priority-badge high';
      case 'medium': return 'priority-badge medium';
      case 'low': return 'priority-badge low';
      default: return 'priority-badge';
    }
  };

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'status-badge pending';
      case 'approved': return 'status-badge approved';
      case 'rejected': return 'status-badge rejected';
      case 'transferred': return 'status-badge transferred';
      default: return 'status-badge';
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

      <div className="requests-list">
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
          <table>
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
        )}
      </div>
    </div>
  );
};

export default RequestList;