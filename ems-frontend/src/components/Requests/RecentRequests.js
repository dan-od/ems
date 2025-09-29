import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './Dashboard.css';

const RecentRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRecentRequests = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:3001/api/requests/recent', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setRequests(response.data);
      } catch (err) {
        console.error('Failed to fetch recent requests:', err);
        setError('Failed to load recent requests');
      } finally {
        setLoading(false);
      }
    };

    fetchRecentRequests();
  }, []);

  const getPriorityBadgeClass = (priority) => {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return 'status-badge urgent';
      case 'high':
        return 'status-badge high';
      case 'medium':
        return 'status-badge medium';
      case 'low':
        return 'status-badge low';
      default:
        return 'status-badge';
    }
  };

  if (loading) return <div className="loading">Loading recent requests...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="recent-requests">
      <h2>Recent Requests</h2>
      {requests.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Equipment</th>
              <th>Requested By</th>
              <th>Date</th>
              <th>Priority</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request._id}>
                <td>{request.equipmentName}</td>
                <td>{request.requestedBy}</td>
                <td>{new Date(request.createdAt).toLocaleDateString()}</td>
                <td>
                  <span className={getPriorityBadgeClass(request.priority)}>
                    {request.priority}
                  </span>
                </td>
                <td>{request.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No recent requests found</p>
      )}
    </div>
  );
};

export default RecentRequests;